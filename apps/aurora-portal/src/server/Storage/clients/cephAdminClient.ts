import { TRPCError } from "@trpc/server"

/**
 * Ceph Admin API Client
 *
 * Uses AWS Signature Version 4 for authentication with admin credentials.
 * Requires admin-level access keys separate from user S3 credentials.
 *
 * Docs: https://docs.ceph.com/en/latest/radosgw/adminops/
 */

interface CephAdminConfig {
  endpoint: string // e.g., "https://rgw.example.com"
  accessKey: string // Admin access key
  secretKey: string // Admin secret key
  region?: string // Default: "default"
}

export class CephAdminClient {
  private endpoint: string
  private accessKey: string
  private secretKey: string

  constructor(config: CephAdminConfig) {
    if (!config.endpoint?.trim()) {
      throw new Error("Ceph Admin API endpoint is required")
    }
    if (!config.accessKey?.trim()) {
      throw new Error("Ceph Admin API access key is required")
    }
    if (!config.secretKey?.trim()) {
      throw new Error("Ceph Admin API secret key is required")
    }

    this.endpoint = config.endpoint.replace(/\/$/, "") // Remove trailing slash
    this.accessKey = config.accessKey
    this.secretKey = config.secretKey
  }
}

/**
 * Create Ceph Admin API client
 *
 * @param endpoint - Optional Ceph endpoint (from service catalog). If not provided, uses env vars.
 * Required env vars:
 * - CEPH_ADMIN_ACCESS_KEY
 * - CEPH_ADMIN_SECRET_KEY
 * - CEPH_ADMIN_ENDPOINT or CEPH_ENDPOINT (if endpoint param not provided)
 *
 * @throws TRPCError with PRECONDITION_FAILED if credentials not configured
 */
export function createCephAdminClient(endpoint?: string): CephAdminClient {
  const resolvedEndpoint = endpoint || process.env.CEPH_ADMIN_ENDPOINT || process.env.CEPH_ENDPOINT
  const accessKey = process.env.CEPH_ADMIN_ACCESS_KEY
  const secretKey = process.env.CEPH_ADMIN_SECRET_KEY

  if (!resolvedEndpoint) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Ceph Admin API endpoint not configured. Ensure Ceph service is in catalog or set CEPH_ADMIN_ENDPOINT.",
    })
  }

  if (!accessKey || !secretKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Ceph Admin API credentials are not configured. Set CEPH_ADMIN_ACCESS_KEY and CEPH_ADMIN_SECRET_KEY environment variables.",
    })
  }

  return new CephAdminClient({
    endpoint: resolvedEndpoint,
    accessKey,
    secretKey,
  })
}

/**
 * Check if Ceph Admin API is configured
 * @returns true if Admin API credentials are available
 */
export function isCephAdminConfigured(): boolean {
  const endpoint = process.env.CEPH_ADMIN_ENDPOINT || process.env.CEPH_ENDPOINT
  const accessKey = process.env.CEPH_ADMIN_ACCESS_KEY
  const secretKey = process.env.CEPH_ADMIN_SECRET_KEY

  return !!(endpoint && accessKey && secretKey)
}
