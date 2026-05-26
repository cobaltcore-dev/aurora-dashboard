import { useState } from "react"
import {
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { MdFolder, MdDescription } from "react-icons/md"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import type { S3Object, S3FolderPrefix } from "@/server/Storage/types/ceph"
import { DeleteObjectModal } from "./DeleteObjectModal"
import { CopyObjectModal } from "./CopyObjectModal"
import { MoveObjectModal } from "./MoveObjectModal"
import { EditMetadataModal } from "./EditMetadataModal"

interface ObjectsTableViewProps {
  bucketName: string
  objects: S3Object[]
  folders: S3FolderPrefix[]
  currentPrefix: string
  onFolderClick: (prefix: string) => void
  onDeleteObjectSuccess: (objectKey: string) => void
  onDeleteObjectError: (objectKey: string, errorMessage: string) => void
  onCopyObjectSuccess: (objectKey: string, targetBucket: string, targetKey: string, wasOverwritten: boolean) => void
  onCopyObjectError: (objectKey: string, errorMessage: string) => void
  onMoveObjectSuccess: (objectKey: string, targetBucket: string, targetKey: string) => void
  onMoveObjectError: (objectKey: string, errorMessage: string) => void
  onEditMetadataSuccess: (objectKey: string) => void
  onEditMetadataError: (objectKey: string, errorMessage: string) => void
}

export function ObjectsTableView({
  bucketName,
  objects,
  folders,
  currentPrefix,
  onFolderClick,
  onDeleteObjectSuccess,
  onDeleteObjectError,
  onCopyObjectSuccess,
  onCopyObjectError,
  onMoveObjectSuccess,
  onMoveObjectError,
  onEditMetadataSuccess,
  onEditMetadataError,
}: ObjectsTableViewProps) {
  const [deleteTarget, setDeleteTarget] = useState<{
    key: string
    size?: number
    lastModified?: string
  } | null>(null)
  const [copyTarget, setCopyTarget] = useState<{
    key: string
    size?: number
  } | null>(null)
  const [moveTarget, setMoveTarget] = useState<{
    key: string
    size?: number
  } | null>(null)
  const [editMetadataTarget, setEditMetadataTarget] = useState<string | null>(null)

  // Strip current prefix from display names
  const stripPrefix = (fullKey: string) => (currentPrefix ? fullKey.replace(currentPrefix, "") : fullKey)

  if (folders.length === 0 && objects.length === 0) {
    return (
      <>
        <DataGrid columns={4}>
          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Name</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Size</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Last Modified</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell />
          </DataGridRow>
          <DataGridRow>
            <DataGridCell colSpan={4}>
              <div className="py-8 text-center">
                <p className="text-theme-light">
                  <Trans>No objects found.</Trans>
                </p>
              </div>
            </DataGridCell>
          </DataGridRow>
        </DataGrid>
        <DeleteObjectModal
          bucketName={bucketName}
          objectKey={deleteTarget?.key ?? ""}
          objectSize={deleteTarget?.size}
          lastModified={deleteTarget?.lastModified}
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onSuccess={onDeleteObjectSuccess}
          onError={onDeleteObjectError}
        />
      </>
    )
  }

  return (
    <>
      <DataGrid columns={4}>
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Size</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Last Modified</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell />
        </DataGridRow>

        {/* Folders first */}
        {folders.map((folder) => {
          const displayName = stripPrefix(folder.prefix).replace(/\/$/, "")
          return (
            <DataGridRow key={folder.prefix}>
              <DataGridCell>
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 rounded text-left hover:underline focus-visible:outline focus-visible:outline-2"
                  onClick={() => onFolderClick(folder.prefix)}
                  title={folder.prefix}
                >
                  <MdFolder size={18} className="text-theme-light shrink-0" />
                  <span className="truncate font-mono text-sm">{displayName}</span>
                </button>
              </DataGridCell>
              <DataGridCell>—</DataGridCell>
              <DataGridCell>—</DataGridCell>
              <DataGridCell onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
                  <PopupMenu>
                    <PopupMenuOptions>
                      <PopupMenuItem
                        label="Delete"
                        onClick={() =>
                          setDeleteTarget({
                            key: folder.prefix,
                          })
                        }
                      />
                    </PopupMenuOptions>
                  </PopupMenu>
                </div>
              </DataGridCell>
            </DataGridRow>
          )
        })}

        {/* Objects */}
        {objects.map((obj) => {
          const displayName = stripPrefix(obj.key)
          return (
            <DataGridRow key={obj.key}>
              <DataGridCell>
                <div className="flex items-center gap-2">
                  <MdDescription size={18} className="text-theme-light shrink-0" />
                  <span className="truncate font-mono text-sm">{displayName}</span>
                </div>
              </DataGridCell>
              <DataGridCell>
                <span className="text-juno-grey-light-1 text-sm">{formatBytesBinary(obj.size)}</span>
              </DataGridCell>
              <DataGridCell>
                <span className="text-juno-grey-light-1 text-sm">
                  {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : "—"}
                </span>
              </DataGridCell>
              <DataGridCell onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
                  <PopupMenu>
                    <PopupMenuOptions>
                      <PopupMenuItem
                        label="Copy"
                        onClick={() =>
                          setCopyTarget({
                            key: obj.key,
                            size: obj.size,
                          })
                        }
                      />
                      <PopupMenuItem
                        label="Move"
                        onClick={() =>
                          setMoveTarget({
                            key: obj.key,
                            size: obj.size,
                          })
                        }
                      />
                      <PopupMenuItem label="Edit Metadata" onClick={() => setEditMetadataTarget(obj.key)} />
                      <PopupMenuItem
                        label="Delete"
                        onClick={() =>
                          setDeleteTarget({
                            key: obj.key,
                            size: obj.size,
                            lastModified: obj.lastModified,
                          })
                        }
                      />
                    </PopupMenuOptions>
                  </PopupMenu>
                </div>
              </DataGridCell>
            </DataGridRow>
          )
        })}
      </DataGrid>

      <DeleteObjectModal
        bucketName={bucketName}
        objectKey={deleteTarget?.key ?? ""}
        objectSize={deleteTarget?.size}
        lastModified={deleteTarget?.lastModified}
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onSuccess={onDeleteObjectSuccess}
        onError={onDeleteObjectError}
      />

      <CopyObjectModal
        bucketName={bucketName}
        objectKey={copyTarget?.key ?? ""}
        objectSize={copyTarget?.size}
        isOpen={copyTarget !== null}
        onClose={() => setCopyTarget(null)}
        onSuccess={onCopyObjectSuccess}
        onError={onCopyObjectError}
      />

      <MoveObjectModal
        bucketName={bucketName}
        objectKey={moveTarget?.key ?? ""}
        objectSize={moveTarget?.size}
        isOpen={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        onSuccess={onMoveObjectSuccess}
        onError={onMoveObjectError}
      />

      <EditMetadataModal
        bucketName={bucketName}
        objectKey={editMetadataTarget ?? ""}
        isOpen={editMetadataTarget !== null}
        onClose={() => setEditMetadataTarget(null)}
        onSuccess={onEditMetadataSuccess}
        onError={onEditMetadataError}
      />
    </>
  )
}
