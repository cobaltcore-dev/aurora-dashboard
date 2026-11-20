import { TRPCError } from "@trpc/server"
import type { z } from "zod"
import { SignalOpenstackError, SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import type { AuroraPortalContext } from "../../context"
import { findLandscapeService, KUBERNETES_LANDSCAPES, type KubernetesLandscape } from "@/types/kubernetes"
import { detectErrorBody, mapGardenerError } from "./gardenerErrors"

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Resolves the catalog endpoint, interface, URL and region for a landscape in the current (project-scoped) session.
 * The result carries the Keystone token: it is internal and must never be returned to the client.
 */
export function resolveGardenerEndpoint(ctx: AuroraPortalContext, landscape: KubernetesLandscape) {
  const token = ctx.openstack?.getToken()
  if (!token || !ctx.openstack) throw new TRPCError({ code: "UNAUTHORIZED" })

  const notAvailable = () =>
    new TRPCError({
      code: "NOT_FOUND",
      message: `Kubernetes landscape ${landscape} is not available for this project.`,
    })

  const entry = findLandscapeService(token.tokenData.catalog ?? [], landscape)
  if (!entry) throw notAvailable()

  const serviceName = KUBERNETES_LANDSCAPES[landscape].service

  try {
    const service = ctx.openstack.service(serviceName)
    // Session default interface first, then public: Persephone runs in a different cluster (Elektra does the same).
    const url = service.getEndpoint() ?? service.getEndpoint({ interfaceName: "public" })
    const endpoint = url ? entry.endpoints.find((candidate) => candidate.url === url) : undefined
    const region = endpoint?.region_id || endpoint?.region
    if (!endpoint || !region || !url) throw notAvailable()

    return { serviceName, interfaceName: endpoint.interface, url, region, authToken: token.authToken }
  } catch (error) {
    // Catalog/service lookup errors → fixed NOT_FOUND (finding 1.3)
    if (error instanceof SignalOpenstackError) {
      throw notAvailable()
    }
    throw error
  }
}

/**
 * Builds the Gardener namespace for a project: `garden-<region>-<projectId>`.
 * See elektra/plugins/kubernetes_ng/app/services/service_layer/kubernetes_ng_service.rb#garden_namespace
 */
export function gardenNamespace(ctx: AuroraPortalContext, region: string): string {
  const token = ctx.openstack?.getToken()
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED" })
  const projectId = token.tokenData.project?.id
  if (!projectId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Project-scoped session required." })
  const ns = `garden-${region}-${projectId}`
  // Kubernetes namespace validation
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(ns)) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Kubernetes namespace could not be determined." })
  }
  return ns
}

/** Path builders for Gardener resources */
export function shootsPath(ns: string): string {
  return `apis/core.gardener.cloud/v1beta1/namespaces/${ns}/shoots`
}

export function shootPath(ns: string, name: string, subresource?: "adminkubeconfig"): string {
  const encodedName = encodeURIComponent(name)
  const base = `${shootsPath(ns)}/${encodedName}`
  return subresource ? `${base}/${subresource}` : base
}

export const CLOUD_PROFILES_PATH = "apis/core.gardener.cloud/v1beta1/cloudprofiles"
export const SSAR_PATH = "apis/authorization.k8s.io/v1/selfsubjectaccessreviews"

export function publicConfigMapPath(name: string): string {
  return `api/v1/namespaces/gardener-system-public/configmaps/${encodeURIComponent(name)}`
}

/**
 * Generic Gardener request helper.
 * Handles auth, timeout, error mapping, JSON parsing and Zod validation uniformly.
 */
export async function gardenerRequest<T extends z.ZodType>(
  ctx: AuroraPortalContext,
  landscape: KubernetesLandscape,
  opts: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    path: string | ((ns: string) => string)
    body?: unknown
    contentType?: "application/json" | "application/merge-patch+json"
    schema: T
    operation: string
    allowNotFound?: boolean
  }
): Promise<z.infer<T> | null> {
  const { serviceName, interfaceName, region, authToken } = resolveGardenerEndpoint(ctx, landscape)
  const ns = gardenNamespace(ctx, region)
  const path = typeof opts.path === "function" ? opts.path(ns) : opts.path

  const secrets = [authToken, `${region}:${authToken}`]

  // signal-openstack always adds X-Auth-Token; the Bearer header follows Elektra's `elektron_gardener`.
  // A service-level headers object replaces the session defaults, so Accept and Content-Type are set here too.
  // Gardener requires Bearer auth with region prefix (tested 2026-11-19):
  // - X-Auth-Token alone: 502 (rejected)
  // - Bearer <token> without region: 502 (rejected)
  // - Bearer <region>:<token>: 200 (works)
  // signal-openstack auto-adds X-Auth-Token, but Gardener ignores it.
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${region}:${authToken}`,
  }
  if (opts.contentType) {
    headers["Content-Type"] = opts.contentType
  }

  const service = ctx.openstack!.service(serviceName, { interfaceName, region, headers })

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    const signal = AbortSignal.any([ctx.signal, timeout])
    const reqBody = opts.body as object | undefined
    switch (opts.method) {
      case "GET":
        response = await service.get(path, { signal })
        break
      case "POST":
        response = await service.post(path, reqBody, { signal })
        break
      case "PUT":
        response = await service.put(path, reqBody, { signal })
        break
      case "PATCH":
        response = await service.patch(path, reqBody, { signal })
        break
      case "DELETE":
        response = await service.del(path, { signal })
        break
    }
  } catch (error) {
    throw mapGardenerError(error, ctx, timeout, { secrets, operation: opts.operation, landscape })
  }

  // Parse JSON response, catching invalid JSON (finding 1.2)
  let body: unknown
  try {
    body = await response.json()
  } catch {
    console.error(`[kubernetes] ${opts.operation}: invalid JSON response`)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid Kubernetes service response." })
  }

  // Check for error body in 2xx response
  const errorBody = detectErrorBody(body)
  if (errorBody) {
    // Handle allowNotFound for 404
    if (opts.allowNotFound && errorBody.status === 404) {
      console.warn(`[kubernetes] ${opts.operation}: resource not found (404)`, { landscape, path })
      return null
    }
    const apiError = new SignalOpenstackApiError(errorBody.message || "", errorBody.status, body)
    throw mapGardenerError(apiError, ctx, timeout, { secrets, operation: opts.operation, landscape })
  }

  // Validate response schema
  const result = opts.schema.safeParse(body)
  if (!result.success) {
    console.error(`[kubernetes] ${opts.operation}: unexpected response`, result.error.issues)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid Kubernetes service response." })
  }
  return result.data
}

/**
 * GET against the Gardener (Persephone) API of a landscape, with credentials injected server-side.
 * `path` is relative (no leading slash). Callers must pass constant or encoded paths, never user strings.
 */
export async function gardenerGet<T extends z.ZodType>(
  ctx: AuroraPortalContext,
  landscape: KubernetesLandscape,
  path: string,
  schema: T
): Promise<z.infer<T>> {
  // allowNotFound is not set, so null is never returned (throws on 404 instead)
  const result = await gardenerRequest(ctx, landscape, { method: "GET", path, schema, operation: "get" })
  return result!
}
