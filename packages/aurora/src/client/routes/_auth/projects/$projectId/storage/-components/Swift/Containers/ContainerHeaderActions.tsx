import { useLingui } from "@lingui/react/macro"
import { Button, PopupMenu, PopupMenuItem, PopupMenuOptions, PopupMenuToggle } from "@cloudoperators/juno-ui-components"

export type ContainerModalType = "manageAccess" | "editMetadata" | "emptyContainer" | "deleteContainer"

interface ContainerHeaderActionsProps {
  onOpenModal: (modal: ContainerModalType) => void
}

/**
 * Container header actions component (Swift objects page)
 *
 * Unlike Ceph's BucketHeaderActions, this menu has no permission props and
 * nothing is conditionally hidden: Swift has no `canUser`/policy wiring
 * anywhere in this area yet (see the TODO(perms) note in
 * `Swift/Containers/index.tsx`), so there is no source of truth to gate on.
 * All four items are always shown once the parent has real container data.
 */
export const ContainerHeaderActions = ({ onOpenModal }: ContainerHeaderActionsProps) => {
  const { t } = useLingui()

  return (
    <PopupMenu>
      <PopupMenuToggle as="div">
        <Button icon="moreVert" title={t`Container actions`} />
      </PopupMenuToggle>
      <PopupMenuOptions>
        <PopupMenuItem
          label={t`Manage Access`}
          onClick={() => onOpenModal("manageAccess")}
          data-testid="container-actions-manage-access"
        />
        <PopupMenuItem
          label={t`Preview and Edit metadata`}
          onClick={() => onOpenModal("editMetadata")}
          data-testid="container-actions-edit-metadata"
        />
        <PopupMenuItem
          label={t`Empty Container`}
          onClick={() => onOpenModal("emptyContainer")}
          data-testid="container-actions-empty"
        />
        <PopupMenuItem
          label={t`Delete Container`}
          onClick={() => onOpenModal("deleteContainer")}
          data-testid="container-actions-delete"
        />
      </PopupMenuOptions>
    </PopupMenu>
  )
}
