import { Trans } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { Stack, Spinner, DataGrid, DataGridRow, DataGridCell, Message } from "@cloudoperators/juno-ui-components"

/**
 * CephUsageOverview - Displays storage usage statistics from Ceph Admin API
 *
 * Shows:
 * - Number of buckets
 * - Number of objects
 * - Storage used (bytes)
 * - Quota limits (if configured)
 * - Usage percentage (if quota available)
 */
export const CephUsageOverview = () => {
  const projectId = useProjectId()

  const {
    data: usage,
    isLoading,
    error,
  } = trpcReact.storage.ceph.usage.getUserUsage.useQuery({
    project_id: projectId,
  })

  if (isLoading) {
    return (
      <Stack distribution="center" alignment="center" gap="2" className="py-4">
        <Spinner variant="primary" />
        <span className="text-sm text-theme-default">
          <Trans>Loading usage statistics...</Trans>
        </span>
      </Stack>
    )
  }

  if (error) {
    // Handle specific error cases
    if (error.message.includes("not configured") || error.data?.code === "PRECONDITION_FAILED") {
      return (
        <Message variant="warning" className="mb-4">
          <Trans>Usage statistics are not available. Ceph Admin API is not configured.</Trans>
        </Message>
      )
    }

    return (
      <Message variant="error" className="mb-4">
        <Trans>Failed to load usage statistics: {error.message}</Trans>
      </Message>
    )
  }

  if (!usage) {
    return null
  }

  // Calculate usage percentage if quota is available
  const usagePercentage =
    usage.bytesQuota && usage.bytesQuota > 0 ? Math.round((usage.bytesUsed / usage.bytesQuota) * 100) : null

  // Determine if approaching quota (>80%)
  const isApproachingQuota = usagePercentage !== null && usagePercentage >= 80
  const isOverQuota = usagePercentage !== null && usagePercentage >= 100

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-3">
        <Trans>Storage Usage</Trans>
      </h3>

      <DataGrid columns={2} className="max-w-2xl">
        <DataGridRow>
          <DataGridCell>
            <Trans>Buckets</Trans>
          </DataGridCell>
          <DataGridCell className="font-mono">{usage.bucketsUsed.toLocaleString()}</DataGridCell>
        </DataGridRow>

        <DataGridRow>
          <DataGridCell>
            <Trans>Objects</Trans>
          </DataGridCell>
          <DataGridCell className="font-mono">{usage.objectsUsed.toLocaleString()}</DataGridCell>
        </DataGridRow>

        <DataGridRow>
          <DataGridCell>
            <Trans>Storage Used</Trans>
          </DataGridCell>
          <DataGridCell className="font-mono">{formatBytesBinary(usage.bytesUsed)}</DataGridCell>
        </DataGridRow>

        {usage.bytesActual && usage.bytesActual !== usage.bytesUsed && (
          <DataGridRow>
            <DataGridCell>
              <Trans>Actual Disk Usage</Trans>
            </DataGridCell>
            <DataGridCell className="font-mono text-theme-light">
              {formatBytesBinary(usage.bytesActual)}
              <span className="text-xs ml-2">
                <Trans>(with replication)</Trans>
              </span>
            </DataGridCell>
          </DataGridRow>
        )}

        {usage.quotaEnabled && usage.bytesQuota && (
          <>
            <DataGridRow>
              <DataGridCell>
                <Trans>Storage Quota</Trans>
              </DataGridCell>
              <DataGridCell className="font-mono">{formatBytesBinary(usage.bytesQuota)}</DataGridCell>
            </DataGridRow>

            <DataGridRow>
              <DataGridCell>
                <Trans>Usage Percentage</Trans>
              </DataGridCell>
              <DataGridCell>
                <span
                  className={`font-mono ${
                    isOverQuota ? "text-theme-error" : isApproachingQuota ? "text-theme-warning" : ""
                  }`}
                >
                  {usagePercentage}%
                </span>
                {isApproachingQuota && !isOverQuota && (
                  <span className="text-xs ml-2 text-theme-warning">
                    <Trans>(approaching limit)</Trans>
                  </span>
                )}
                {isOverQuota && (
                  <span className="text-xs ml-2 text-theme-error">
                    <Trans>(over quota)</Trans>
                  </span>
                )}
              </DataGridCell>
            </DataGridRow>
          </>
        )}

        {usage.quotaEnabled && usage.objectsQuota && (
          <DataGridRow>
            <DataGridCell>
              <Trans>Object Quota</Trans>
            </DataGridCell>
            <DataGridCell className="font-mono">{usage.objectsQuota.toLocaleString()}</DataGridCell>
          </DataGridRow>
        )}
      </DataGrid>

      {isOverQuota && (
        <Message variant="error" className="mt-4">
          <Trans>
            You have exceeded your storage quota. Please delete some objects or contact your administrator to increase
            the quota.
          </Trans>
        </Message>
      )}
    </div>
  )
}
