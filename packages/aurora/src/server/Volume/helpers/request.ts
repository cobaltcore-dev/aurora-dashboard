import { TRPCError } from "@trpc/server"
import { z } from "zod"
import type { AuroraPortalContext } from "../../context"
import { findCinderService } from "@/types/volume"

export function getVolumeService(ctx: AuroraPortalContext) {
  const token = ctx.openstack?.getToken()
  const entry = findCinderService(token?.tokenData.catalog ?? [])
  if (!entry || !ctx.openstack) throw new TRPCError({ code: "NOT_FOUND", message: "Block storage is not available." })
  const service = ctx.openstack.service(entry.type)
  const endpoint = service.getEndpoint()
  if (!endpoint || !/\/v3(?:\/|$)/.test(new URL(endpoint).pathname)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "A Cinder v3 endpoint is required." })
  }
  return service
}

export async function readVolumeResponse<T extends z.ZodType>(
  ctx: AuroraPortalContext,
  service: ReturnType<typeof getVolumeService>,
  resourcePath: string,
  schema: T,
  queryParams?: Record<string, string>
): Promise<z.infer<T>> {
  const response = await service.get(resourcePath, {
    queryParams,
    headers: { "OpenStack-API-Version": "volume 3.0" },
    signal: AbortSignal.any([ctx.signal, AbortSignal.timeout(30_000)]),
  })
  if (!response.ok) {
    const codes: Record<number, TRPCError["code"]> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
    }
    throw new TRPCError({
      code: codes[response.status] ?? "INTERNAL_SERVER_ERROR",
      message: "Could not read block storage.",
    })
  }
  const result = schema.safeParse(await response.json())
  if (!result.success)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid block storage response." })
  return result.data
}

const linksSchema = z.array(z.object({ rel: z.string(), href: z.string() })).optional()

/** One tRPC query collects all Cinder pages; only local markers are followed, never arbitrary URLs. */
export async function listVolumeResources<T extends z.ZodType>(
  ctx: AuroraPortalContext,
  collection: "volumes" | "snapshots",
  itemSchema: T,
  volumeId?: string
): Promise<z.infer<T>[]> {
  const service = getVolumeService(ctx)
  const endpoint = service.getEndpoint()!
  const resourcePath = `${collection}/detail`
  const expected = new URL(`${endpoint.replace(/\/$/, "")}/${resourcePath}`)
  const schema = z.object({
    [collection]: z.array(itemSchema),
    [`${collection}_links`]: linksSchema,
  })
  const results: z.infer<T>[] = []
  const seen = new Set<string>()
  let marker: string | undefined
  do {
    const page = await readVolumeResponse(ctx, service, resourcePath, schema, {
      ...(volumeId ? { volume_id: volumeId } : {}),
      ...(marker ? { marker } : {}),
    })
    results.push(...(page[collection] as z.infer<T>[]))
    const links = page[`${collection}_links`] as z.infer<typeof linksSchema>
    const next = links?.find((link) => link.rel === "next")
    if (!next) break
    const url = new URL(next.href, expected)
    if (
      url.origin !== expected.origin ||
      url.pathname !== expected.pathname ||
      url.username ||
      url.password ||
      url.searchParams.has("all_tenants") ||
      (url.searchParams.get("volume_id") ?? undefined) !== volumeId
    ) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid block storage pagination link." })
    }
    marker = url.searchParams.get("marker") ?? undefined
    if (!marker || seen.has(marker)) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Block storage pagination did not advance." })
    }
    seen.add(marker)
  } while (marker)
  return results
}

/** Admin tokens can show other projects' resources; keep Aurora's detail routes project-only. */
export function assertResourceProject(ctx: AuroraPortalContext, owner: string | null | undefined) {
  const token = ctx.openstack?.getToken()?.tokenData
  const isAdmin = token?.roles?.some((role) => role.name === "admin")
  if ((owner && owner !== token?.project?.id) || (isAdmin && !owner)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found or not accessible in this project." })
  }
}
