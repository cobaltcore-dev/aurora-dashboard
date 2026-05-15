import { createHmac } from "node:crypto"
import { TRPCError } from "@trpc/server"
import { cephUserStatsSchema, cephQuotaSchema, type CephUserStats, type CephQuota } from "../types/ceph"

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

interface CephAdminUserResponse {
  user_id: string
  display_name: string
  email?: string
  suspended: number
  max_buckets: number
  subusers?: unknown[]
  keys?: unknown[]
  swift_keys?: unknown[]
  caps?: unknown[]
  stats?: CephUserStats
  bucket_quota?: CephQuota
  user_quota?: CephQuota
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

  /**
   * Generate AWS Signature V2 (older, simpler version used by Ceph Admin API)
   * Ceph Admin API uses AWS Signature V2, not V4
   */
  private generateSignatureV2(method: string, path: string, queryString: string): string {
    const canonicalString = `${method}\n\n\n\n${path}?${queryString}`
    const hmac = createHmac("sha1", this.secretKey)
    hmac.update(canonicalString)
    return hmac.digest("base64")
  }

  /**
   * Build Authorization header for Ceph Admin API
   */
  private buildAuthHeader(method: string, path: string, queryString: string): string {
    const signature = this.generateSignatureV2(method, path, queryString)
    return `AWS ${this.accessKey}:${signature}`
  }

  /**
   * Make authenticated request to Ceph Admin API
   */
  private async request<T>(
    path: string,
    params: Record<string, string | boolean> = {},
    method: "GET" | "POST" | "DELETE" = "GET"
  ): Promise<T> {
    const queryParams = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
      queryParams.append(key, String(value))
    }

    const queryString = queryParams.toString()
    const url = `${this.endpoint}${path}?${queryString}`

    const authHeader = this.buildAuthHeader(method, path, queryString)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new TRPCError({
          code: response.status === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: `Ceph Admin API error: ${response.status} ${response.statusText}`,
          cause: errorText,
        })
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to connect to Ceph Admin API",
        cause: error,
      })
    }
  }

  /**
   * Get user information including stats and quotas
   *
   * @param uid - User ID (OpenStack user ID or project ID depending on setup)
   * @param includeStats - Include usage statistics
   * @returns User info with stats and quotas
   */
  async getUserInfo(uid: string, includeStats = true): Promise<CephAdminUserResponse> {
    if (!uid?.trim()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User ID is required",
      })
    }

    return this.request<CephAdminUserResponse>("/admin/user", {
      uid,
      stats: includeStats,
    })
  }

  /**
   * Get user usage statistics
   *
   * @param uid - User ID
   * @returns Usage statistics (buckets, objects, bytes)
   */
  async getUserStats(uid: string): Promise<CephUserStats> {
    const userInfo = await this.getUserInfo(uid, true)

    if (!userInfo.stats) {
      // If stats not present, return zeros
      return {
        num_buckets: 0,
        num_objects: 0,
        size: 0,
      }
    }

    // Validate with Zod
    const parsed = cephUserStatsSchema.safeParse(userInfo.stats)
    if (!parsed.success) {
      console.error("[cephAdminClient] Invalid stats format:", parsed.error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Invalid stats format from Ceph Admin API",
        cause: parsed.error,
      })
    }

    return parsed.data
  }

  /**
   * Get user quota information
   *
   * @param uid - User ID
   * @returns Quota configuration
   */
  async getUserQuota(uid: string): Promise<CephQuota | null> {
    const userInfo = await this.getUserInfo(uid, false)

    if (!userInfo.user_quota) {
      return null
    }

    // Validate with Zod
    const parsed = cephQuotaSchema.safeParse(userInfo.user_quota)
    if (!parsed.success) {
      console.error("[cephAdminClient] Invalid quota format:", parsed.error)
      return null // Don't fail on quota parsing errors
    }

    return parsed.data
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
 * - CEPH_REGION (optional, default: "default")
 *
 * @throws TRPCError with PRECONDITION_FAILED if credentials not configured
 */
export function createCephAdminClient(endpoint?: string): CephAdminClient {
  const resolvedEndpoint = endpoint || process.env.CEPH_ADMIN_ENDPOINT || process.env.CEPH_ENDPOINT
  const accessKey = process.env.CEPH_ADMIN_ACCESS_KEY
  const secretKey = process.env.CEPH_ADMIN_SECRET_KEY
  const region = process.env.CEPH_REGION

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
    region,
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
