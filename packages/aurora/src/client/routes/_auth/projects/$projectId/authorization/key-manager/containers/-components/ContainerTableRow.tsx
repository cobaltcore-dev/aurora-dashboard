import {
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { uuidFromRef } from "../../-components/utils"
import { CopyText } from "../../-components/CopyText"
import type { Container } from "@/server/KeyManager/types/keyManager"

interface ContainerTableRowProps {
  container: Container
  canDelete: boolean
  onShowDetails: (container: Container) => void
  onDelete: (container: Container) => void
}

export function ContainerTableRow({ container, canDelete, onShowDetails, onDelete }: ContainerTableRowProps) {
  const id = uuidFromRef(container.container_ref)
  return (
    <DataGridRow>
      <DataGridCell>
        <div>{container.name ?? <em>unnamed</em>}</div>
        <div className="text-xs opacity-60">
          <CopyText text={id} />
        </div>
      </DataGridCell>
      <DataGridCell>{container.type}</DataGridCell>
      <DataGridCell>{container.status}</DataGridCell>
      <DataGridCell onClick={(e: React.MouseEvent) => e.stopPropagation()} className="items-end pr-0">
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label="Show Details" onClick={() => onShowDetails(container)} />
            {canDelete && <PopupMenuItem label="Delete" onClick={() => onDelete(container)} />}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
