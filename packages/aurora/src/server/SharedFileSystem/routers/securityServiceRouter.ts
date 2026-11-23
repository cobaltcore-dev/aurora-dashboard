import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../../trpc"
import {
  securityServiceSchema,
  listSecurityServicesInputSchema,
  securityServiceIdInputSchema,
} from "../types/securityService"
import { getManilaService, readManila, listManila, keepProjectItems, assertProjectOwnership } from "../helpers/request"
import type { SharedFileSystemPermissionCheck } from "../helpers/permissions"

export const buildSecurityServiceResourceRouter = (check: SharedFileSystemPermissionCheck) => ({
  listSecurityServices: projectScopedProcedure.input(listSecurityServicesInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "shared-file-system:security_services:list")) throw new TRPCError({ code: "FORBIDDEN" })
    // The api-ref does not list share_network_id; Manila's controller supports it and skips project scoping on that path
    // https://opendev.org/openstack/manila/src/branch/master/manila/api/v2/security_service.py
    const services = await listManila(
      ctx,
      "security-services",
      "security_services",
      securityServiceSchema,
      input.shareNetworkId ? { share_network_id: input.shareNetworkId } : undefined
    )
    const filtered = keepProjectItems(ctx, services)
    // Defense against a deployment silently ignoring a filter: only return services associated with the requested network.
    if (input.shareNetworkId) {
      return filtered.filter((item) => !item.share_networks || item.share_networks.includes(input.shareNetworkId!))
    }
    return filtered
  }),
  getSecurityServiceById: projectScopedProcedure.input(securityServiceIdInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "shared-file-system:security_services:read")) throw new TRPCError({ code: "FORBIDDEN" })
    const { security_service } = await readManila(
      ctx,
      getManilaService(ctx),
      `security-services/${input.securityServiceId}`,
      z.object({ security_service: securityServiceSchema })
    )
    await assertProjectOwnership(ctx, security_service.project_id, async () => {
      if (!check(ctx, "shared-file-system:security_services:list")) return false
      const services = await listManila(ctx, "security-services", "security_services", securityServiceSchema)
      return services.some((item) => item.id === security_service.id)
    })
    return security_service
  }),
})
