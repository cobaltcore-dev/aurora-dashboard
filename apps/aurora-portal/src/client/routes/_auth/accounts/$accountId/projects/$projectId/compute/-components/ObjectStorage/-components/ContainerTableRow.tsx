import { DataGridCell, DataGridRow } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

interface Container {
  count: number
  bytes: number
  name: string
  last_modified: string
}

interface ContainerTableRowProps {
  container: Container
}

export function ContainerTableRow({ container }: ContainerTableRowProps) {
  const { t } = useLingui()
  const { name, count, bytes, last_modified } = container

  // Format bytes to human-readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B"

    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  // Format date to localized string
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return t`N/A`
    }
  }

  return (
    <DataGridRow key={name} data-testid={`container-row-${name}`}>
      <DataGridCell>{name}</DataGridCell>
      <DataGridCell>{count.toLocaleString()}</DataGridCell>
      <DataGridCell>{formatDate(last_modified)}</DataGridCell>
      <DataGridCell>{formatBytes(bytes)}</DataGridCell>
    </DataGridRow>
  )
}
