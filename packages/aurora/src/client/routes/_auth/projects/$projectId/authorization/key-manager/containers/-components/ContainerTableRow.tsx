import {
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { uuidFromRef } from "../../-components/utils"
import ClipboardText from "@/client/components/ClipboardText"
import type { Container } from "@/server/KeyManager/types/keyManager"

interface ContainerTableRowProps {
  container: Container
  canDelete: boolean
  onShowDetails: (container: Container) => void
  onDelete: (container: Container) => void
}

export function ContainerTableRow({ container, canDelete, onShowDetails, onDelete }: ContainerTableRowProps) {
  const { t } = useLingui()
  const id = uuidFromRef(container.container_ref)
  return (
    <DataGridRow>
      <DataGridCell>
        <div>{container.name ?? <em>{t`unnamed`}</em>}</div>
        <div className="text-xs opacity-60">
          <ClipboardText text={id} />
        </div>
      </DataGridCell>
      <DataGridCell>{container.type}</DataGridCell>
      <DataGridCell>{container.status}</DataGridCell>
      <DataGridCell onClick={(e: React.MouseEvent) => e.stopPropagation()} className="items-end pr-0">
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Show Details`} onClick={() => onShowDetails(container)} />
            {canDelete && <PopupMenuItem label={t`Delete`} onClick={() => onDelete(container)} />}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
