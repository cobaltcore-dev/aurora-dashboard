import { TRPCError } from "@trpc/server"

/**
 * Validates that the OpenStack Network service is available
 * @param network - The OpenStack Network service instance
 * @throws TRPCError if service is not available
 */
export function validateNetworkService(network: unknown): asserts network is NonNullable<typeof network> {
  if (!network) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Network service is not available",
    })
  }
}

/**
 * Handles specific error cases for floating IP operations with custom messages
 */
export const FloatingIpErrorHandlers = {
  /**
   * Handles errors specific to floating IP deletion
   */
  delete: (response: { status?: number; statusText?: string }, floatingIpId: string) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: "UNAUTHORIZED",
          message: `Unauthorized access: ${floatingIpId}`,
        })
      case 404:
        return new TRPCError({
          code: "NOT_FOUND",
          message: `Floating IP not found: ${floatingIpId}`,
        })

      case 412:
        return new TRPCError({
          code: "CONFLICT",
          message: `Precondition failed - revision number mismatch: ${floatingIpId}`,
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete floating IP: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  // list: (response: { status?: number; statusText?: string }, imageId: string) => {
  //   switch (response.status) {
  //     case 404:
  //       return new TRPCError({
  //         code: "NOT_FOUND",
  //         message: `Image not found: ${imageId}`,
  //       })
  //     case 403:
  //       return new TRPCError({
  //         code: "FORBIDDEN",
  //         message: `Access forbidden - only shared images have members: ${imageId}`,
  //       })
  //     default:
  //       return new TRPCError({
  //         code: "INTERNAL_SERVER_ERROR",
  //         message: `Failed to fetch image members: ${response.statusText || "Unknown error"}`,
  //       })
  //   }
  // },
  // get: (response: { status?: number; statusText?: string }, imageId: string, memberId: string) => {
  //   switch (response.status) {
  //     case 404:
  //       return new TRPCError({
  //         code: "NOT_FOUND",
  //         message: `Image or member not found: ${imageId}, ${memberId}`,
  //       })
  //     case 403:
  //       return new TRPCError({
  //         code: "FORBIDDEN",
  //         message: `Access forbidden to image member: ${imageId}, ${memberId}`,
  //       })
  //     default:
  //       return new TRPCError({
  //         code: "INTERNAL_SERVER_ERROR",
  //         message: `Failed to fetch image member: ${response.statusText || "Unknown error"}`,
  //       })
  //   }
  // },
}
