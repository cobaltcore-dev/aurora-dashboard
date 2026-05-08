import { DataGrid, DataGridRow, DataGridCell, DataGridHeadCell } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { MdFolder, MdDescription } from "react-icons/md"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import type { S3Object, S3FolderPrefix } from "@/server/Storage/types/s3"

interface S3ObjectsTableViewProps {
  bucketName: string
  objects: S3Object[]
  folders: S3FolderPrefix[]
  currentPrefix: string
  onFolderClick: (prefix: string) => void
}

export function S3ObjectsTableView({ objects, folders, currentPrefix, onFolderClick }: S3ObjectsTableViewProps) {
  if (folders.length === 0 && objects.length === 0) {
    return (
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
          <DataGridHeadCell>
            <Trans>Actions</Trans>
          </DataGridHeadCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridCell colSpan={4}>
            <span className="text-juno-grey-light-1 text-sm">
              <Trans>No objects found.</Trans>
            </span>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  // Strip current prefix from display names
  const stripPrefix = (fullKey: string) => (currentPrefix ? fullKey.replace(currentPrefix, "") : fullKey)

  return (
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
        <DataGridHeadCell>
          <Trans>Actions</Trans>
        </DataGridHeadCell>
      </DataGridRow>

      {/* Folders first */}
      {folders.map((folder) => {
        const displayName = stripPrefix(folder.prefix).replace(/\/$/, "")
        return (
          <DataGridRow
            key={folder.prefix}
            onClick={() => onFolderClick(folder.prefix)}
            className="hover:bg-juno-grey-blue-10 cursor-pointer"
          >
            <DataGridCell>
              <div className="flex items-center gap-2">
                <MdFolder className="text-juno-grey-light-1" />
                <span className="font-mono text-sm">{displayName}</span>
              </div>
            </DataGridCell>
            <DataGridCell>—</DataGridCell>
            <DataGridCell>—</DataGridCell>
            <DataGridCell>—</DataGridCell>
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
                <MdDescription className="text-juno-grey-light-1" />
                <span className="font-mono text-sm">{displayName}</span>
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
            <DataGridCell>{/* TODO: Add actions menu (download, delete, etc) */}</DataGridCell>
          </DataGridRow>
        )
      })}
    </DataGrid>
  )
}
