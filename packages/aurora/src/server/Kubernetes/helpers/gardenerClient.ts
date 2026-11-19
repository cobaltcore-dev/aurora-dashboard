import { TRPCError } from "@trpc/server"
import type { z } from "zod"
import type { AuroraPortalContext } from "../../context"
import { findLandscapeService, KUBERNETES_LANDSCAPES, type KubernetesLandscape } from "@/types/kubernetes"
import { detectErrorBody, mapGardenerError, mapGardenerStatus } from "./gardenerErrors"

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Resolves the catalog endpoint, interface and region for a landscape in the current (project-scoped) session.
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
  const service = ctx.openstack.service(serviceName)
  // Session default interface first, then public: Persephone runs in a different cluster (Elektra does the same).
  const url = service.getEndpoint() ?? service.getEndpoint({ interfaceName: "public" })
  const endpoint = url ? entry.endpoints.find((candidate) => candidate.url === url) : undefined
  const region = endpoint?.region_id || endpoint?.region
  if (!endpoint || !region) throw notAvailable()

  return { serviceName, interfaceName: endpoint.interface, region, authToken: token.authToken }
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
  const { serviceName, interfaceName, region, authToken } = resolveGardenerEndpoint(ctx, landscape)
  // signal-openstack always adds X-Auth-Token; the Bearer header follows Elektra's `elektron_gardener`.
  // A service-level headers object replaces the session defaults, so Accept is set here too.
  // Gardener requires Bearer auth with region prefix (tested 2026-11-19):
  // - X-Auth-Token alone: 502 (rejected)
  // - Bearer <token> without region: 502 (rejected)
  // - Bearer <region>:<token>: 200 (works)
  // signal-openstack auto-adds X-Auth-Token, but Gardener ignores it.
  const service = ctx.openstack!.service(serviceName, {
    interfaceName,
    region,
    headers: { Accept: "application/json", Authorization: `Bearer ${region}:${authToken}` },
  })

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await service.get(path, { signal: AbortSignal.any([ctx.signal, timeout]) })
  } catch (error) {
    throw mapGardenerError(error, ctx, timeout)
  }

  const body: unknown = await response.json()
  const errorBody = detectErrorBody(body)
  if (errorBody) throw mapGardenerStatus(errorBody.status, errorBody.message, ctx.validateSession() === true)

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid Kubernetes service response." })
  }
  return result.data
}
