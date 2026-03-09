import { TRPCError } from "@trpc/server"

/**
 * Capitalizes the first letter of a string
 */
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

/**
 * Validates that an OpenStack service is available
 * @param service - The OpenStack service instance
 * @param serviceName - Name of the service for error messages (e.g., "network", "compute", "glance")
 * @throws TRPCError with INTERNAL_SERVER_ERROR if service is not available
 *
 * @example
 * ```ts
 * const network = session?.service("network")
 * validateOpenstackService(network, "network")
 * // network is now typed as NonNullable
 * ```
 */
export function validateOpenstackService(
  service: unknown,
  serviceName: string
): asserts service is NonNullable<typeof service> {
  if (!service) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `${capitalize(serviceName)} service is not available`,
    })
  }
}
