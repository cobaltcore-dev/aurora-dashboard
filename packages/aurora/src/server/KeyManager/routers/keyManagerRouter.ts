import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { projectScopedProcedure, projectScopedInputSchema } from "@/server/trpc"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"
import { parseOrThrow } from "@/server/Network/helpers"
import { loadPolicyEngine } from "@/server/policies"
import type { AuroraPortalContext } from "@/server/context"
import {
  SecretSchema,
  ContainerSchema,
  OrderSchema,
  SecretsListSchema,
  ContainersListSchema,
  OrdersListSchema,
  CreateSecretInputSchema,
  UpdateSecretInputSchema,
  CreateContainerInputSchema,
  CreateOrderInputSchema,
} from "../types/keyManager"

/** policy-engine's wording when a rule isn't present and there is no `_default` to fall back on. */
const MISSING_RULE_MESSAGE = /not found and no _default rule available/

const paginationInput = z.object({
  offset: z.number().default(0),
  limit: z.number().default(20),
})

const secretsSearchInput = z.object({
  name: z.string().optional(),
  sort: z.string().optional(),
})

const containersSearchInput = z.object({
  name: z.string().optional(),
})

const resourceIdInput = z.object({ secretId: z.string() })
const containerIdInput = z.object({ containerId: z.string() })
const orderIdInput = z.object({ orderId: z.string() })

function mapKmError(error: unknown, operation: string): TRPCError {
  const statusCode = (error as { statusCode?: number })?.statusCode
  const codeMap: Record<number, TRPCError["code"]> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
  }
  return new TRPCError({
    code: codeMap[statusCode ?? 0] ?? "INTERNAL_SERVER_ERROR",
    message: `Key Manager ${operation} failed`,
    cause: error,
  })
}

function uuidFromRef(ref: string): string {
  return ref.split("/").pop() ?? ref
}

/**
 * Builds the Key Manager resource router with a server-side policy guard on every operation.
 *
 * The client gates the UI via `canUser`, but that is advisory only. Enforcing the same Aurora
 * policy here — before the Barbican request is issued — makes Aurora authoritative, so an
 * operation Aurora denies cannot be reached by calling the procedure directly even when Barbican
 * would permit it. The engine is loaded once at build time from the consumer's `policyDir`.
 */
export const buildKeyManagerResourceRouter = (policyDir: string) => {
  const engine = loadPolicyEngine("key-manager.json", policyDir)

  const enforce = (ctx: AuroraPortalContext, rule: string) => {
    const token = ctx.openstack?.getToken()
    if (!token) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
    }
    const policy = engine.policy(token.tokenData, {
      defaultParams: { project_id: token.tokenData.project?.id },
    })
    let allowed: boolean
    try {
      allowed = policy.check(rule)
    } catch (error) {
      // A rule the loaded policy file doesn't define is treated as a denial rather than a crash:
      // operators supply their own policy files and may be a rule behind. Logged so it stays
      // diagnosable. Any other evaluator error is a real fault and is rethrown.
      if (error instanceof Error && MISSING_RULE_MESSAGE.test(error.message)) {
        console.warn(`Key Manager rule '${rule}' is not defined in the loaded policy file; denying.`)
        allowed = false
      } else {
        throw error
      }
    }
    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not authorized to perform this Key Manager operation.",
      })
    }
  }

  return {
    // ─── Secrets ─────────────────────────────────────────────────────────────

    listSecrets: projectScopedProcedure
      .input(projectScopedInputSchema.extend({ ...paginationInput.shape, ...secretsSearchInput.shape }))
      .query(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:secrets:list")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const params = new URLSearchParams()
        params.set("offset", String(input.offset))
        params.set("limit", String(input.limit))
        if (input.name) params.set("name", input.name)
        if (input.sort) params.set("sort", input.sort)
        const res = await km.get(`v1/secrets?${params}`).catch((e: unknown) => {
          throw mapKmError(e, "list secrets")
        })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "list secrets")
        return parseOrThrow(SecretsListSchema, await res.json(), "keyManager.listSecrets")
      }),

    getSecret: projectScopedProcedure
      .input(projectScopedInputSchema.extend(resourceIdInput.shape))
      .query(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:secrets:get")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const res = await km.get(`v1/secrets/${encodeURIComponent(input.secretId)}`).catch((e: unknown) => {
          throw mapKmError(e, "get secret")
        })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "get secret")
        return parseOrThrow(SecretSchema, await res.json(), "keyManager.getSecret")
      }),

    getSecretPayload: projectScopedProcedure
      .input(projectScopedInputSchema.extend(resourceIdInput.shape))
      .query(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:secrets:payload")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        // Barbican's /payload endpoint rejects the client's default Accept: application/json with 406;
        // request the raw stored material instead. debug:false keeps secret material out of transport logs.
        const res = await km
          .get(`v1/secrets/${encodeURIComponent(input.secretId)}/payload`, {
            headers: { Accept: "application/octet-stream" },
            debug: false,
          })
          .catch((e: unknown) => {
            throw mapKmError(e, "get secret payload")
          })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "get secret payload")
        const contentType = res.headers?.get?.("content-type") ?? "text/plain"
        const text = await res.text()
        return { payload: text, contentType }
      }),

    createSecret: projectScopedProcedure
      .input(projectScopedInputSchema.extend(CreateSecretInputSchema.shape))
      .mutation(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:secrets:create")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const body = {
          name: input.name,
          secret_type: input.secret_type,
          algorithm: input.algorithm,
          bit_length: input.bit_length,
          mode: input.mode,
          payload: input.payload,
          payload_content_type: input.payload_content_type,
          payload_content_encoding: input.payload_content_encoding,
          expiration: input.expiration,
        }
        const res = await km.post("v1/secrets", body).catch((e: unknown) => {
          throw mapKmError(e, "create secret")
        })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "create secret")
        const data = await res.json()
        return { secretId: uuidFromRef(data.secret_ref as string), secret_ref: data.secret_ref as string }
      }),

    updateSecret: projectScopedProcedure
      .input(projectScopedInputSchema.extend(UpdateSecretInputSchema.shape))
      .mutation(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:secrets:update")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const res = await km
          .put(`v1/secrets/${encodeURIComponent(input.secretId)}`, input.payload, {
            headers: { "Content-Type": input.payload_content_type },
          })
          .catch((e: unknown) => {
            throw mapKmError(e, "update secret")
          })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "update secret")
      }),

    deleteSecret: projectScopedProcedure
      .input(projectScopedInputSchema.extend(resourceIdInput.shape))
      .mutation(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:secrets:delete")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const res = await km.del(`v1/secrets/${encodeURIComponent(input.secretId)}`).catch((e: unknown) => {
          throw mapKmError(e, "delete secret")
        })
        if (res && !res.ok) throw mapKmError({ statusCode: res.status }, "delete secret")
      }),

    // ─── Containers ───────────────────────────────────────────────────────────

    listContainers: projectScopedProcedure
      .input(projectScopedInputSchema.extend({ ...paginationInput.shape, ...containersSearchInput.shape }))
      .query(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:containers:list")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const params = new URLSearchParams()
        params.set("offset", String(input.offset))
        params.set("limit", String(input.limit))
        if (input.name) params.set("name", input.name)
        const res = await km.get(`v1/containers?${params}`).catch((e: unknown) => {
          throw mapKmError(e, "list containers")
        })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "list containers")
        return parseOrThrow(ContainersListSchema, await res.json(), "keyManager.listContainers")
      }),

    getContainer: projectScopedProcedure
      .input(projectScopedInputSchema.extend(containerIdInput.shape))
      .query(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:containers:get")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const res = await km.get(`v1/containers/${encodeURIComponent(input.containerId)}`).catch((e: unknown) => {
          throw mapKmError(e, "get container")
        })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "get container")
        return parseOrThrow(ContainerSchema, await res.json(), "keyManager.getContainer")
      }),

    createContainer: projectScopedProcedure
      .input(projectScopedInputSchema.extend(CreateContainerInputSchema.shape))
      .mutation(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:containers:create")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const body = {
          name: input.name,
          type: input.type,
          secret_refs: input.secret_refs,
        }
        const res = await km.post("v1/containers", body).catch((e: unknown) => {
          throw mapKmError(e, "create container")
        })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "create container")
        const data = await res.json()
        return {
          containerId: uuidFromRef(data.container_ref as string),
          container_ref: data.container_ref as string,
        }
      }),

    deleteContainer: projectScopedProcedure
      .input(projectScopedInputSchema.extend(containerIdInput.shape))
      .mutation(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:containers:delete")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const res = await km.del(`v1/containers/${encodeURIComponent(input.containerId)}`).catch((e: unknown) => {
          throw mapKmError(e, "delete container")
        })
        if (res && !res.ok) throw mapKmError({ statusCode: res.status }, "delete container")
      }),

    // ─── Orders ───────────────────────────────────────────────────────────────

    listOrders: projectScopedProcedure
      .input(projectScopedInputSchema.extend({ ...paginationInput.shape }))
      .query(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:orders:list")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const params = new URLSearchParams()
        params.set("offset", String(input.offset))
        params.set("limit", String(input.limit))
        // Barbican's GET /v1/orders supports only offset/limit — no sort params.
        const res = await km.get(`v1/orders?${params}`).catch((e: unknown) => {
          throw mapKmError(e, "list orders")
        })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "list orders")
        return parseOrThrow(OrdersListSchema, await res.json(), "keyManager.listOrders")
      }),

    getOrder: projectScopedProcedure
      .input(projectScopedInputSchema.extend(orderIdInput.shape))
      .query(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:orders:get")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const res = await km.get(`v1/orders/${encodeURIComponent(input.orderId)}`).catch((e: unknown) => {
          throw mapKmError(e, "get order")
        })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "get order")
        return parseOrThrow(OrderSchema, await res.json(), "keyManager.getOrder")
      }),

    createOrder: projectScopedProcedure
      .input(projectScopedInputSchema.extend(CreateOrderInputSchema.shape))
      .mutation(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:orders:create")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const body = {
          type: input.type,
          meta: input.meta,
        }
        const res = await km.post("v1/orders", body).catch((e: unknown) => {
          throw mapKmError(e, "create order")
        })
        if (!res.ok) throw mapKmError({ statusCode: res.status }, "create order")
        const data = await res.json()
        return { orderId: uuidFromRef(data.order_ref as string), order_ref: data.order_ref as string }
      }),

    deleteOrder: projectScopedProcedure
      .input(projectScopedInputSchema.extend(orderIdInput.shape))
      .mutation(async ({ input, ctx }) => {
        enforce(ctx, "key-manager:orders:delete")
        const km = ctx.openstack?.service("key-manager")
        validateOpenstackService(km, "key-manager")
        const res = await km.del(`v1/orders/${encodeURIComponent(input.orderId)}`).catch((e: unknown) => {
          throw mapKmError(e, "delete order")
        })
        if (res && !res.ok) throw mapKmError({ statusCode: res.status }, "delete order")
      }),
  }
}
