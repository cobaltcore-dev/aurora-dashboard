import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { ErrorHandler } from "./errorHandling"

/**
 * Handles specific error cases for floating IP operations with predefined messages from errorHandling module.
 * @param resourceName - The name of the resource being accessed
 * @returns TRPCError with appropriate code and message
 */
export const FloatingIpErrorHandlers = {
  list: ErrorHandler("Floating IP"),

  create: ErrorHandler("Floating IP"),

  get: ErrorHandler("Floating IP"),

  update: ErrorHandler("Floating IP"),

  delete: ErrorHandler("Floating IP"),
}

/**
 * Re-throws an error raised while allocating a floating IP, surfacing OpenStack's own reason.
 *
 * The OpenStack client throws `SignalOpenstackApiError` on a non-2xx response, with Neutron's
 * reason already parsed into `error.message` (e.g. "Bad floatingip request: dns_name cannot be
 * specified without a dns_domain."). For a 400 we forward that reason to the user instead of a
 * generic string.
 *
 * IMPORTANT: the TRPCError is built WITHOUT forwarding the `SignalOpenstackApiError` as `cause`.
 * The shared `openstackErrorMiddleware` re-maps any error whose cause is a `SignalOpenstackApiError`
 * to a generic "The OpenStack request was invalid.", which would discard the reason below. Non-400
 * errors are re-thrown unchanged so that middleware can still apply its session/permission messages.
 */
export function rethrowFloatingIpCreateError(error: unknown): never {
  if (error instanceof SignalOpenstackApiError && error.statusCode === 400) {
    const detail = error.message?.trim()
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: detail ? `Failed to allocate floating IP: ${detail}` : "Failed to allocate floating IP.",
    })
  }
  throw error
}
