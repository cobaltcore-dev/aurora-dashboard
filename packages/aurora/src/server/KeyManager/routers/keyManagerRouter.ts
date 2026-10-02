import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { projectScopedProcedure, projectScopedInputSchema } from "@/server/trpc"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"
import { parseOrThrow } from "@/server/Network/helpers"
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

const ordersSearchInput = z.object({
  sort: z.string().optional(),
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

export const keyManagerRouter = {
  // ─── Secrets ─────────────────────────────────────────────────────────────

  listSecrets: projectScopedProcedure
    .input(projectScopedInputSchema.extend({ ...paginationInput.shape, ...secretsSearchInput.shape }))
    .query(async ({ input, ctx }) => {
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
      const km = ctx.openstack?.service("key-manager")
      validateOpenstackService(km, "key-manager")
      const res = await km.get(`v1/secrets/${encodeURIComponent(input.secretId)}/payload`).catch((e: unknown) => {
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
      const km = ctx.openstack?.service("key-manager")
      validateOpenstackService(km, "key-manager")
      const res = await km.del(`v1/containers/${encodeURIComponent(input.containerId)}`).catch((e: unknown) => {
        throw mapKmError(e, "delete container")
      })
      if (res && !res.ok) throw mapKmError({ statusCode: res.status }, "delete container")
    }),

  addContainerSecret: projectScopedProcedure
    .input(
      projectScopedInputSchema.extend({
        containerId: z.string(),
        name: z.string(),
        secret_ref: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const km = ctx.openstack?.service("key-manager")
      validateOpenstackService(km, "key-manager")
      const res = await km
        .post(`v1/containers/${encodeURIComponent(input.containerId)}/secrets`, {
          name: input.name,
          secret_ref: input.secret_ref,
        })
        .catch((e: unknown) => {
          throw mapKmError(e, "add container secret")
        })
      if (!res.ok) throw mapKmError({ statusCode: res.status }, "add container secret")
    }),

  deleteContainerSecret: projectScopedProcedure
    .input(
      projectScopedInputSchema.extend({
        containerId: z.string(),
        secretName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const km = ctx.openstack?.service("key-manager")
      validateOpenstackService(km, "key-manager")
      const res = await km
        .del(`v1/containers/${encodeURIComponent(input.containerId)}/secrets/${encodeURIComponent(input.secretName)}`)
        .catch((e: unknown) => {
          throw mapKmError(e, "delete container secret")
        })
      if (res && !res.ok) throw mapKmError({ statusCode: res.status }, "delete container secret")
    }),

  // ─── Orders ───────────────────────────────────────────────────────────────

  listOrders: projectScopedProcedure
    .input(projectScopedInputSchema.extend({ ...paginationInput.shape, ...ordersSearchInput.shape }))
    .query(async ({ input, ctx }) => {
      const km = ctx.openstack?.service("key-manager")
      validateOpenstackService(km, "key-manager")
      const params = new URLSearchParams()
      params.set("offset", String(input.offset))
      params.set("limit", String(input.limit))
      if (input.sort) {
        const [sortKey, sortDir] = input.sort.split(":")
        if (sortKey) params.set("sort_key", sortKey)
        if (sortDir) params.set("sort_dir", sortDir)
      }
      const res = await km.get(`v1/orders?${params}`).catch((e: unknown) => {
        throw mapKmError(e, "list orders")
      })
      if (!res.ok) throw mapKmError({ statusCode: res.status }, "list orders")
      return parseOrThrow(OrdersListSchema, await res.json(), "keyManager.listOrders")
    }),

  getOrder: projectScopedProcedure
    .input(projectScopedInputSchema.extend(orderIdInput.shape))
    .query(async ({ input, ctx }) => {
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
      const km = ctx.openstack?.service("key-manager")
      validateOpenstackService(km, "key-manager")
      const res = await km.del(`v1/orders/${encodeURIComponent(input.orderId)}`).catch((e: unknown) => {
        throw mapKmError(e, "delete order")
      })
      if (res && !res.ok) throw mapKmError({ statusCode: res.status }, "delete order")
    }),
}
