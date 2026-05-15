import { protectedProcedure } from "../../trpc"
import { getServiceInfoInputSchema, s3ServiceInfoSchema, type S3ServiceInfo } from "../types/ceph"

/**
 * Service Info Router - provides information about S3/Ceph cluster capabilities and limits
 *
 * This is similar to Swift's /info endpoint but for S3.
 * Since S3 API doesn't have a standard /info endpoint, we return a hardcoded
 * set of capabilities and limits based on Ceph RADOS Gateway documentation.
 *
 * Uses protectedProcedure (not project-scoped) because:
 * - Service information is cluster-wide, not project-specific
 * - Available to all authenticated users
 * - No project-specific data accessed
 */
export const serviceInfoRouter = {
  /**
   * Get S3 service information including limits and capabilities
   *
   * Returns hardcoded values based on Ceph RGW defaults and S3 API standards.
   * These values are typical for Ceph RADOS Gateway deployments.
   *
   * Future enhancement: Could query actual Ceph Admin API for dynamic limits
   * if `/admin/config` endpoint becomes available.
   */
  getServiceInfo: protectedProcedure.input(getServiceInfoInputSchema).query(async (): Promise<S3ServiceInfo> => {
    // Hardcoded service info based on Ceph RGW defaults
    // These are typical values but can be customized per deployment
    const serviceInfo: S3ServiceInfo = {
      limits: {
        // Object size limits
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5 GB default for single PUT
        // Note: With multipart upload, objects can be much larger (up to 5 TB)

        // Naming limits (S3 standards)
        maxBucketNameLength: 63, // S3 standard: 3-63 chars
        maxObjectNameLength: 1024, // S3 standard: max 1024 bytes UTF-8

        // Listing limits
        bucketListingLimit: 1000, // S3 standard: max 1000 keys per request

        // Bulk operations
        maxDeletesPerRequest: 1000, // DeleteObjects limit (S3 standard)

        // Multipart upload limits
        maxMultipartParts: 10000, // S3 standard
        minMultipartPartSize: 5 * 1024 * 1024, // 5 MB (except last part)
      },

      capabilities: {
        // Storage features
        bucketVersioning: true, // Ceph RGW supports versioning
        objectLocking: false, // Not supported in most Ceph RGW versions
        bucketReplication: false, // Requires specific Ceph RGW setup

        // Access control
        bucketPolicies: true, // Ceph RGW supports bucket policies
        bucketACLs: true, // S3 ACLs supported
        objectACLs: true, // Object-level ACLs supported

        // Lifecycle
        lifecycleRules: true, // Ceph RGW supports lifecycle policies
        objectExpiration: true, // Part of lifecycle

        // CORS
        corsConfiguration: true, // Ceph RGW supports CORS

        // Website hosting
        staticWebsiteHosting: true, // Ceph RGW supports static websites

        // Upload/Download
        multipartUpload: true, // Full multipart upload support
        presignedUrls: true, // Pre-signed URLs supported
        rangeRequests: true, // Byte-range requests supported

        // Tagging
        bucketTagging: true, // Ceph RGW supports bucket tags
        objectTagging: true, // Object tags supported

        // Monitoring & Logging
        serverAccessLogging: false, // Not standard in Ceph RGW
        eventNotifications: false, // Requires specific Ceph setup (bucket notifications)

        // Advanced
        objectMetadata: true, // Custom metadata (x-amz-meta-*) supported
        serverSideEncryption: true, // SSE-C and SSE-S3 supported in newer versions
      },

      // Version info (could be made dynamic if we query Ceph)
      version: "Ceph RADOS Gateway (RGW)",
      region: process.env.CEPH_REGION || "default",
    }

    // Validate the response
    const parsed = s3ServiceInfoSchema.safeParse(serviceInfo)
    if (!parsed.success) {
      console.error("[serviceInfoRouter] Invalid service info format:", parsed.error)
      // Still return the data even if validation fails - better than nothing
      return serviceInfo
    }

    return parsed.data
  }),
}
