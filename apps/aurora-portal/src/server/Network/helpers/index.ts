import type { AuroraPortalContext } from "@/server/context"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"

export const HTTP_STATUS_ERROR_MAP = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  412: "PRECONDITION_FAILED",
} as const

export const DEFAULT_ERROR_NAME = "INTERNAL_SERVER_ERROR"

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
