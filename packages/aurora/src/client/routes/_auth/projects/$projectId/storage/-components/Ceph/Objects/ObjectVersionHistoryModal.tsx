import { useEffect, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useModalTracking } from "@/client/hooks/useModalTracking"
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

  const { trackClose, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.object.version.history",
  })

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
  const [feedbackMessage, setFeedbackMessage] = useState<{
    variant: "success" | "error"
    message: string
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
    setFeedbackMessage(null)
    resetTracking()
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1 md:max-w-[500px] lg:max-w-[1000px] xl:max-w-[1100px]">
          <span className="shrink-0">
            <Trans>Version History:</Trans>
          </span>
          <span className="truncate" title={objectKey}>
            {objectKey}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      size="xl"
    >
      <Stack direction="vertical" gap="4">
        {feedbackMessage && (
          <Message variant={feedbackMessage.variant} dismissible onDismiss={() => setFeedbackMessage(null)}>
            {feedbackMessage.message}
          </Message>
        )}

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
                        <Badge variant="info">
                          <Trans>Older</Trans>
                        </Badge>
                      )}
                    </DataGridCell>

                    <DataGridCell>
                      <code className="text-xs break-all" title={version.versionId}>
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
                            {!isDeleteMarker && !isLatest && (
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
          const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
          setFeedbackMessage({
            variant: "success",
            message: t`${displayName} was successfully restored`,
          })
          onRestoreVersion?.(objectKey, versionId)
          setTimeout(() => refetch(), 100)
        }}
        onError={(_objectKey, errorMessage) => {
          setRestoreTarget(null)
          setFeedbackMessage({
            variant: "error",
            message: t`Failed to restore version: ${errorMessage}`,
          })
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
          const shortVersionId = versionId.slice(0, 8)
          setFeedbackMessage({
            variant: "success",
            message: t`Version ${shortVersionId}... deleted successfully`,
          })
          onDeleteVersion?.(objectKey, versionId)
          setTimeout(() => refetch(), 100)
        }}
        onError={(_objectKey, errorMessage) => {
          setDeleteTarget(null)
          setFeedbackMessage({
            variant: "error",
            message: t`Failed to delete version: ${errorMessage}`,
          })
        }}
      />
    </Modal>
  )
}
