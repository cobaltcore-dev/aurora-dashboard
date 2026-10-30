import {
  DataGridRow,
  DataGridCell,
  Button,
  PopupMenu,
  PopupMenuToggle,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuSectionSeparator,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { uuidFromRef } from "../../-components/utils"
import ClipboardText from "@/client/components/ClipboardText"
import type { Secret } from "@/server/KeyManager/types/keyManager"

interface SecretTableRowProps {
  secret: Secret
  canDeleteSecret: boolean
  onShowDetails: (secret: Secret) => void
  onDelete: (secret: Secret) => void
}

export function SecretTableRow({ secret, canDeleteSecret, onShowDetails, onDelete }: SecretTableRowProps) {
  const { t } = useLingui()
  const id = uuidFromRef(secret.secret_ref)
  return (
    <DataGridRow>
      <DataGridCell>
        <div>{secret.name ?? <em>{t`unnamed`}</em>}</div>
        <div className="text-xs opacity-60">
          <ClipboardText text={id} />
        </div>
      </DataGridCell>
      <DataGridCell>{secret.status}</DataGridCell>
      <DataGridCell>{secret.secret_type}</DataGridCell>
      <DataGridCell>{secret.content_types ? Object.values(secret.content_types).join(", ") : "- -"}</DataGridCell>
      <DataGridCell onClick={(e: React.MouseEvent) => e.stopPropagation()} className="items-end pr-0">
        <PopupMenu>
          <PopupMenuToggle as="div">
            <Button
              icon="moreVert"
              title={t`Secret actions`}
              aria-label={t`Secret actions`}
              className="!bg-transparent"
            />
          </PopupMenuToggle>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Show Details`} onClick={() => onShowDetails(secret)} />
            {canDeleteSecret && (
              <>
                <PopupMenuSectionSeparator />
                <PopupMenuItem label={t`Delete`} onClick={() => onDelete(secret)} />
              </>
            )}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
