import { TRPCError } from "@trpc/server"
import { cephProcedure } from "../cephProcedure"
import { getUserUsageInputSchema, usageInfoSchema, type UsageInfo } from "../types/ceph"
import { createCephAdminClient, isCephAdminConfigured } from "../clients/cephAdminClient"

/**
 * Usage Router - handles Ceph usage statistics and quotas
 *
 * Uses Ceph Admin API to retrieve usage data:
 * - Bucket count
 * - Object count
 * - Storage used (bytes)
 * - Quota limits (if configured)
 */

/**
 * Gets usage statistics for the current project
 *
 * Uses cephProcedure (not cephProtectedProcedure) because:
 * - Admin API uses different credentials than user S3 credentials
 * - User doesn't need S3 credentials to view usage stats
 * - Access control is handled by project scope
 *
 * Flow:
 * 1. Check if Ceph Admin API is configured
 * 2. Get current project ID from context
 * 3. Query Ceph Admin API with project ID as uid
 * 4. Retrieve stats (buckets, objects, bytes) and quota
 * 5. Transform to frontend-friendly format
 */
export const usageRouter = {
  getUserUsage: cephProcedure.input(getUserUsageInputSchema).query(async ({ ctx }): Promise<UsageInfo> => {
    // Check if Admin API is configured
    if (!isCephAdminConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Usage statistics are not available. Ceph Admin API is not configured.",
      })
    }

    const token = ctx.openstack?.getToken()
    const projectId = token?.tokenData.project?.id

    if (!projectId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Project ID not found in token",
      })
    }

    // Get Ceph endpoint from service catalog (same as S3 endpoint)
    let endpoint: string
    try {
      const service = ctx.openstack?.service("ceph")
      const catalogEndpoint = service?.getEndpoint?.()
      if (!catalogEndpoint) {
        throw new Error("Ceph service endpoint not found in catalog")
      }
      // Extract base URL by removing Swift path (Admin API is at base URL)
      const swiftIndex = catalogEndpoint.indexOf("/swift/")
      endpoint = swiftIndex !== -1 ? catalogEndpoint.substring(0, swiftIndex) : catalogEndpoint
    } catch (error) {
      console.error("[usageRouter] Failed to resolve Ceph endpoint:", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to resolve Ceph endpoint from service catalog",
        cause: error,
      })
    }

    try {
      // Create admin client with endpoint from service catalog
      const adminClient = createCephAdminClient(endpoint)

      // Get user stats from Ceph Admin API
      // In Ceph, the "user" (uid) typically maps to OpenStack project ID
      const stats = await adminClient.getUserStats(projectId)

      // Get quota info (optional - may not be configured)
      let quota = null
      try {
        quota = await adminClient.getUserQuota(projectId)
      } catch (error) {
        console.warn("[usageRouter] Failed to get quota, continuing without it:", error)
        // Continue without quota - it's optional
      }

      // Transform to frontend format
      const usageInfo: UsageInfo = {
        bucketsUsed: stats.num_buckets,
        objectsUsed: stats.num_objects,
        bytesUsed: stats.size,
        bytesActual: stats.size_actual || stats.size_utilized,
      }

      // Add quota if available and enabled
      if (quota?.enabled) {
        if (quota.max_size && quota.max_size > 0) {
          usageInfo.bytesQuota = quota.max_size
        }
        if (quota.max_objects && quota.max_objects > 0) {
          usageInfo.objectsQuota = quota.max_objects
        }
        usageInfo.quotaEnabled = true
      }

      // Validate output
      const parsed = usageInfoSchema.safeParse(usageInfo)
      if (!parsed.success) {
        console.error("[usageRouter] Invalid usage info format:", parsed.error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to format usage information",
          cause: parsed.error,
        })
      }

      return parsed.data
    } catch (error) {
      // If it's already a TRPCError, re-throw it
      if (error instanceof TRPCError) {
        throw error
      }

      // Generic error
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve usage statistics",
        cause: error,
      })
    }
  }),
}
