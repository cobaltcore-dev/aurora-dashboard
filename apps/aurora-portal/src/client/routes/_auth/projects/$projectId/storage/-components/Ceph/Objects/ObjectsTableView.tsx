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

interface ObjectsTableViewProps {
  bucketName: string
  objects: S3Object[]
  folders: S3FolderPrefix[]
  currentPrefix: string
  onFolderClick: (prefix: string) => void
  onDeleteObjectSuccess: (objectKey: string) => void
  onDeleteObjectError: (objectKey: string, errorMessage: string) => void
}

export function ObjectsTableView({
  bucketName,
  objects,
  folders,
  currentPrefix,
  onFolderClick,
  onDeleteObjectSuccess,
  onDeleteObjectError,
}: ObjectsTableViewProps) {
  const [deleteTarget, setDeleteTarget] = useState<{
    key: string
    size?: number
    lastModified?: string
  } | null>(null)

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
                        onClick={() => {
                          // TODO: Open copy modal
                          console.log("Copy", obj.key)
                        }}
                      />
                      <PopupMenuItem
                        label="Move"
                        onClick={() => {
                          // TODO: Open move modal
                          console.log("Move", obj.key)
                        }}
                      />
                      <PopupMenuItem
                        label="Edit Metadata"
                        onClick={() => {
                          // TODO: Open metadata editor
                          console.log("Edit metadata", obj.key)
                        }}
                      />
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
    </>
  )
}
