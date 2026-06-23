import { useState, useEffect } from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import {
  Spinner,
  Stack,
  Button,
  Badge,
  Message,
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  DataGridToolbar,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import type { ObjectVersion } from "@/server/Storage/types/versioning"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { RestoreVersionModal } from "./RestoreVersionModal"
import { DeleteVersionModal } from "./DeleteVersionModal"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"
import { useNavigate } from "@tanstack/react-router"

interface ObjectVersionsViewProps {
  bucketName: string
  objectKey: string
}

export function ObjectVersionsView({ bucketName, objectKey }: ObjectVersionsViewProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate()

  const [restoreTarget, setRestoreTarget] = useState<{
    versionId: string
    date?: string
    size?: number
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    versionId: string
    date?: string
    size?: number
    isDeleteMarker: boolean
  } | null>(null)

  const { data, isLoading, error, refetch } = trpcReact.storage.ceph.versioning.listObjectVersions.useQuery(
    {
      project_id: projectId ?? "",
      bucket: bucketName,
      key: objectKey,
    },
    {
      enabled: !!projectId && !!bucketName && !!objectKey,
      staleTime: 0, // Always fetch fresh data
    }
  )

  // Query versioning status for current bucket
  const { data: versioningStatus } = trpcReact.storage.ceph.versioning.getStatus.useQuery(
    {
      project_id: projectId ?? "",
      bucket: bucketName,
    },
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  )

  // Query bucket policy status
  const { data: policyData } = trpcReact.storage.ceph.bucketPolicy.get.useQuery(
    {
      project_id: projectId ?? "",
      bucketName,
    },
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: false,
    }
  )

  // Refetch when params change
  useEffect(() => {
    if (projectId && bucketName && objectKey) {
      refetch()
    }
  }, [projectId, bucketName, objectKey, refetch])

  const versions = data || []
  const versionCount = versions.length

  // Extract folder path from objectKey
  const folderPath = objectKey.includes("/") ? objectKey.substring(0, objectKey.lastIndexOf("/") + 1) : ""

  const navigateToBuckets = () => {
    navigate({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { projectId: projectId || "", provider: "ceph", storageType: "buckets" },
    })
  }

  const navigateToPrefix = (prefix: string) => {
    navigate({
      to: "/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
      params: {
        projectId: projectId || "",
        provider: "ceph",
        storageType: "buckets",
        containerName: bucketName,
      },
      search: { prefix: prefix ? btoa(prefix) : undefined },
    })
  }

  if (isLoading) {
    return (
      <Stack className="absolute inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading versions...</Trans>
      </Stack>
    )
  }

  if (error) {
    return (
      <Message variant="error" title={t`Failed to load versions`}>
        {error.message}
      </Message>
    )
  }

  return (
    <div className="relative">
      {/* Bucket header with versioning status badge */}
      <div className="mb-4 flex items-center justify-between">
        <Stack direction="horizontal" gap="3" alignment="center">
          <h2 className="text-xl font-semibold">{bucketName}</h2>
          {versioningStatus && versioningStatus.status === "Enabled" && (
            <Badge variant="success">
              <Trans>Versioning Enabled</Trans>
            </Badge>
          )}
          {versioningStatus && versioningStatus.status === "Suspended" && (
            <Badge variant="warning">
              <Trans>Versioning Suspended</Trans>
            </Badge>
          )}
          {policyData?.policy && (
            <Badge variant="info">
              <Trans>Policy</Trans>
            </Badge>
          )}
        </Stack>
      </div>

      <ObjectsFileNavigation
        bucketName={bucketName}
        prefix={folderPath}
        onBucketsClick={navigateToBuckets}
        onPrefixClick={navigateToPrefix}
        objectKey={objectKey}
        showVersions={false}
      />

      <Stack direction="vertical">
        {/* Zone 1 — removed header and back button, breadcrumbs will handle navigation */}
        <Stack distribution="end" alignment="center" gap="2" className="pb-2">
          {/* Empty zone for consistency with other views */}
        </Stack>

        {/* Zone 2 — Info message */}
        <DataGridToolbar>
          <Message variant="info" className="w-full">
            <Trans>
              Showing all versions of this object. The latest version is highlighted. Delete markers indicate when the
              object was deleted.
            </Trans>
          </Message>
        </DataGridToolbar>

        {/* Zone 3 — Version count */}
        <DataGridToolbar>
          <Stack distribution="start" gap="2" alignment="center" className="text-sm">
            <div className="text-theme-light flex items-center gap-1">
              <Plural value={versionCount} one={`${versionCount} version`} other={`${versionCount} versions`} />
            </div>
          </Stack>
        </DataGridToolbar>
      </Stack>

      {versions.length === 0 ? (
        <Message variant="info" className="mt-4">
          <Trans>No versions found for this object.</Trans>
        </Message>
      ) : (
        <DataGrid columns={6}>
          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Status</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Version ID</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Last Modified</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Size</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>ETag</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Actions</Trans>
            </DataGridHeadCell>
          </DataGridRow>

          {versions.map((version: ObjectVersion) => {
            const isLatest = version.isLatest
            const isDeleteMarker = version.isDeleteMarker ?? false

            return (
              <DataGridRow key={version.versionId}>
                <DataGridCell>
                  {isDeleteMarker ? (
                    <Badge variant="error">
                      <Trans>Delete Marker</Trans>
                    </Badge>
                  ) : isLatest ? (
                    <Badge variant="success">
                      <Trans>Latest</Trans>
                    </Badge>
                  ) : (
                    <Badge variant="default">
                      <Trans>Version</Trans>
                    </Badge>
                  )}
                </DataGridCell>
                <DataGridCell>{version.versionId}</DataGridCell>
                <DataGridCell>
                  {version.lastModified
                    ? new Date(version.lastModified).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </DataGridCell>
                <DataGridCell>{version.size !== undefined ? formatBytesBinary(version.size) : "-"}</DataGridCell>
                <DataGridCell>{version.etag || "-"}</DataGridCell>
                <DataGridCell>
                  <PopupMenu>
                    <PopupMenuToggle as="div">
                      <Button size="small" icon="moreVert" />
                    </PopupMenuToggle>
                    <PopupMenuOptions>
                      {!isDeleteMarker && !isLatest && (
                        <PopupMenuItem
                          label={t`Restore`}
                          onClick={() =>
                            setRestoreTarget({
                              versionId: version.versionId,
                              date: version.lastModified,
                              size: version.size,
                            })
                          }
                        />
                      )}
                      <PopupMenuItem
                        label={t`Delete`}
                        onClick={() =>
                          setDeleteTarget({
                            versionId: version.versionId,
                            date: version.lastModified,
                            size: version.size,
                            isDeleteMarker,
                          })
                        }
                      />
                    </PopupMenuOptions>
                  </PopupMenu>
                </DataGridCell>
              </DataGridRow>
            )
          })}
        </DataGrid>
      )}

      {/* Modals */}
      {restoreTarget && (
        <RestoreVersionModal
          isOpen={true}
          bucketName={bucketName}
          objectKey={objectKey}
          versionId={restoreTarget.versionId}
          onClose={() => setRestoreTarget(null)}
          onSuccess={() => {
            setRestoreTarget(null)
            refetch()
          }}
          onError={() => {
            setRestoreTarget(null)
          }}
        />
      )}

      {deleteTarget && (
        <DeleteVersionModal
          isOpen={true}
          bucketName={bucketName}
          objectKey={objectKey}
          versionId={deleteTarget.versionId}
          isDeleteMarker={deleteTarget.isDeleteMarker}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null)
            refetch()
          }}
          onError={() => {
            setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}
