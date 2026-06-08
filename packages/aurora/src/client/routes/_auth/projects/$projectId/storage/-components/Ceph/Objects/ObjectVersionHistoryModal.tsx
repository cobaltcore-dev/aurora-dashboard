import { useEffect, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import type { ObjectVersion } from "@/server/Storage/types/versioning"
import {
  Modal,
  Stack,
  Message,
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  Badge,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Spinner,
} from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { RestoreVersionModal } from "./RestoreVersionModal"
import { DeleteVersionModal } from "./DeleteVersionModal"

interface ObjectVersionHistoryModalProps {
  isOpen: boolean
  bucketName: string
  objectKey: string
  onClose: () => void
  onRestoreVersion?: (objectKey: string, versionId: string) => void
  onDeleteVersion?: (objectKey: string, versionId: string) => void
}

export const ObjectVersionHistoryModal = ({
  isOpen,
  bucketName,
  objectKey,
  onClose,
  onRestoreVersion,
  onDeleteVersion,
}: ObjectVersionHistoryModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
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
      enabled: isOpen && !!projectId && !!bucketName && !!objectKey,
      staleTime: 0, // Always fetch fresh data when modal opens
    }
  )

  // Refetch when modal opens
  useEffect(() => {
    if (isOpen && projectId && bucketName && objectKey) {
      refetch()
    }
  }, [isOpen, projectId, bucketName, objectKey, refetch])

  // data is already ObjectVersion[] array
  const versions = data || []

  const handleClose = () => {
    setRestoreTarget(null)
    setDeleteTarget(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal title={t`Version History: ${objectKey}`} open={isOpen} onCancel={handleClose} size="large">
      <Stack direction="vertical" gap="4">
        {isLoading && (
          <Stack direction="horizontal" gap="2" alignment="center" className="py-8">
            <Spinner />
            <span className="text-theme-light text-sm">
              <Trans>Loading versions...</Trans>
            </span>
          </Stack>
        )}

        {error && (
          <Message variant="error" title={t`Failed to load versions`}>
            {error.message}
          </Message>
        )}

        {!isLoading && !error && versions.length === 0 && (
          <Message variant="info">
            <Trans>No versions found for this object.</Trans>
          </Message>
        )}

        {!isLoading && !error && versions.length > 0 && (
          <>
            <Message variant="info">
              <Trans>
                Showing all versions of this object. The latest version is highlighted. Delete markers indicate when the
                object was deleted.
              </Trans>
            </Message>

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

              {versions.map((version: ObjectVersion, index: number) => {
                const isLatest = index === 0
                const isDeleteMarker = version.isDeleteMarker ?? false

                return (
                  <DataGridRow key={version.versionId}>
                    <DataGridCell>
                      {isLatest ? (
                        <Badge variant="success">
                          <Trans>Latest</Trans>
                        </Badge>
                      ) : isDeleteMarker ? (
                        <Badge variant="error">
                          <Trans>Delete Marker</Trans>
                        </Badge>
                      ) : (
                        <Badge variant="info">
                          <Trans>Older</Trans>
                        </Badge>
                      )}
                    </DataGridCell>

                    <DataGridCell>
                      <code className="font-mono text-xs break-all" title={version.versionId}>
                        {version.versionId}
                      </code>
                    </DataGridCell>

                    <DataGridCell>
                      <span className="text-theme-light text-sm">
                        {version.lastModified ? new Date(version.lastModified).toLocaleString() : "—"}
                      </span>
                    </DataGridCell>

                    <DataGridCell>
                      <span className="text-theme-light text-sm">
                        {isDeleteMarker ? "—" : formatBytesBinary(version.size ?? 0)}
                      </span>
                    </DataGridCell>

                    <DataGridCell>
                      <span className="text-theme-light text-xs break-all">
                        {isDeleteMarker ? "—" : version.etag || "—"}
                      </span>
                    </DataGridCell>

                    <DataGridCell>
                      <div className="flex justify-end">
                        <PopupMenu>
                          <PopupMenuOptions>
                            {!isDeleteMarker && (
                              <>
                                <PopupMenuItem
                                  label={t`Download`}
                                  onClick={() => {
                                    // TODO: Generate download URL with versionId
                                    console.log("Download version:", version.versionId)
                                  }}
                                />
                                {!isLatest && (
                                  <PopupMenuItem
                                    label={t`Restore`}
                                    onClick={() => {
                                      setRestoreTarget({
                                        versionId: version.versionId,
                                        date: version.lastModified,
                                        size: version.size,
                                      })
                                    }}
                                  />
                                )}
                              </>
                            )}
                            <PopupMenuItem
                              label={isDeleteMarker ? t`Delete Marker` : t`Delete Version`}
                              onClick={() => {
                                setDeleteTarget({
                                  versionId: version.versionId,
                                  date: version.lastModified,
                                  size: version.size,
                                  isDeleteMarker,
                                })
                              }}
                            />
                          </PopupMenuOptions>
                        </PopupMenu>
                      </div>
                    </DataGridCell>
                  </DataGridRow>
                )
              })}
            </DataGrid>
          </>
        )}
      </Stack>

      <RestoreVersionModal
        isOpen={restoreTarget !== null}
        bucketName={bucketName}
        objectKey={objectKey}
        versionId={restoreTarget?.versionId ?? ""}
        versionDate={restoreTarget?.date}
        versionSize={restoreTarget?.size}
        onClose={() => setRestoreTarget(null)}
        onSuccess={(objectKey, versionId) => {
          setRestoreTarget(null)
          onRestoreVersion?.(objectKey, versionId)
          // Invalidate is handled by RestoreVersionModal, but we refetch to ensure immediate update
          setTimeout(() => refetch(), 100)
        }}
        onError={() => {
          setRestoreTarget(null)
        }}
      />

      <DeleteVersionModal
        isOpen={deleteTarget !== null}
        bucketName={bucketName}
        objectKey={objectKey}
        versionId={deleteTarget?.versionId ?? ""}
        versionDate={deleteTarget?.date}
        versionSize={deleteTarget?.size}
        isDeleteMarker={deleteTarget?.isDeleteMarker ?? false}
        onClose={() => setDeleteTarget(null)}
        onSuccess={(objectKey, versionId) => {
          setDeleteTarget(null)
          onDeleteVersion?.(objectKey, versionId)
          // Invalidate is handled by DeleteVersionModal, but we refetch to ensure immediate update
          setTimeout(() => refetch(), 100)
        }}
        onError={() => {
          setDeleteTarget(null)
        }}
      />
    </Modal>
  )
}
