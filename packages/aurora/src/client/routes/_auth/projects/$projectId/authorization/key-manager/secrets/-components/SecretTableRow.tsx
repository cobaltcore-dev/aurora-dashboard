import {
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { uuidFromRef } from "../../-components/utils"
import { CopyText } from "../../-components/CopyText"
import type { Secret } from "@/server/KeyManager/types/keyManager"

interface SecretTableRowProps {
  secret: Secret
  canDelete: boolean
  onShowDetails: (secret: Secret) => void
  onDelete: (secret: Secret) => void
}

export function SecretTableRow({ secret, canDelete, onShowDetails, onDelete }: SecretTableRowProps) {
  const id = uuidFromRef(secret.secret_ref)
  return (
    <DataGridRow>
      <DataGridCell>
        <div>{secret.name ?? <em>unnamed</em>}</div>
        <div className="text-xs opacity-60">
          <CopyText text={id} />
        </div>
      </DataGridCell>
      <DataGridCell>{secret.secret_type}</DataGridCell>
      <DataGridCell>{secret.content_types ? Object.values(secret.content_types).join(", ") : "—"}</DataGridCell>
      <DataGridCell>{secret.status}</DataGridCell>
      <DataGridCell onClick={(e: React.MouseEvent) => e.stopPropagation()} className="items-end pr-0">
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label="Show Details" onClick={() => onShowDetails(secret)} />
            {canDelete && <PopupMenuItem label="Delete" onClick={() => onDelete(secret)} />}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
