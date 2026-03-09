import type { AuroraPortalContext } from "@/server/context"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"

/**
 * Gets the network service from the OpenStack session and validates it
 * @param ctx - The tRPC context
 * @returns The validated network service
 * @throws TRPCError if session is invalid or network service is unavailable
 */
export const getNetworkService = (ctx: AuroraPortalContext) => {
  const openstackSession = ctx.openstack
  const network = openstackSession?.service("network")
  validateOpenstackService(network, "network")
  return network
}
