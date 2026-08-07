import type { DeleteObjectError } from "@/server/Storage/types/ceph"

/**
 * S3's DeleteObjects reports per-item failures inline in an otherwise successful
 * (HTTP 200) response, so a *resolved* deleteVersionsBulk mutation can still carry
 * failures. Flatten those entries into one human-readable line for the small
 * single/two-item version modals, which have no room for a per-key results table
 * (DeleteObjectsModal renders the full breakdown for large selections instead).
 */
export const formatBulkDeleteErrors = (errors: DeleteObjectError[]): string =>
  errors
    .map((error) => {
      const label = error.versionId ? `${error.key} (${error.versionId})` : error.key
      const detail = [error.code, error.message].filter(Boolean).join(": ")
      return detail ? `${label}: ${detail}` : label
    })
    .join("; ")
