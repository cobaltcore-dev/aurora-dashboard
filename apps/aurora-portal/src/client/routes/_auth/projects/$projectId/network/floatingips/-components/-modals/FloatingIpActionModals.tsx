import type { ReactNode } from "react"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { useModal } from "@/client/utils/useModal"
import { useFloatingIpMutations } from "../../-hooks/useFloatingIpMutations"
import { AssociateFloatingIpModal } from "./AssociateFloatingIpModal"
import { DetachFloatingIpModal } from "./DetachFloatingIpModal"
import { EditFloatingIpModal } from "./EditFloatingIpModal"
import { ReleaseFloatingIpModal } from "./ReleaseFloatingIpModal"

export interface FloatingIpActionModalTriggers {
  toggleEditModal: () => void
  toggleAttachModal: () => void
  toggleDetachModal: () => void
  toggleReleaseModal: () => void
}

interface FloatingIpActionModalsProps {
  floatingIp: FloatingIp
  children: (triggers: FloatingIpActionModalTriggers) => ReactNode
}

export const FloatingIpActionModals = ({ floatingIp, children }: FloatingIpActionModalsProps) => {
  const [editModalOpen, toggleEditModal] = useModal(false)
  const [attachModalOpen, toggleAttachModal] = useModal(false)
  const [detachModalOpen, toggleDetachModal] = useModal(false)
  const [releaseModalOpen, toggleReleaseModal] = useModal(false)

  const { handleUpdate, handleDelete, isUpdatePending, updateError, isDeletePending, deleteError } =
    useFloatingIpMutations()

  return (
    <>
      {children({
        toggleEditModal,
        toggleAttachModal,
        toggleDetachModal,
        toggleReleaseModal,
      })}

      {editModalOpen && (
        <EditFloatingIpModal
          floatingIp={floatingIp}
          open={editModalOpen}
          onClose={toggleEditModal}
          onUpdate={handleUpdate}
          isLoading={isUpdatePending}
          error={updateError}
        />
      )}

      {attachModalOpen && (
        <AssociateFloatingIpModal
          floatingIp={floatingIp}
          open={attachModalOpen}
          onClose={toggleAttachModal}
          onUpdate={handleUpdate}
          isLoading={isUpdatePending}
          error={updateError}
        />
      )}

      {detachModalOpen && (
        <DetachFloatingIpModal
          floatingIp={floatingIp}
          open={detachModalOpen}
          onClose={toggleDetachModal}
          onUpdate={handleUpdate}
          isLoading={isUpdatePending}
          error={updateError}
        />
      )}

      {releaseModalOpen && (
        <ReleaseFloatingIpModal
          floatingIp={floatingIp}
          open={releaseModalOpen}
          onClose={toggleReleaseModal}
          onUpdate={handleDelete}
          isLoading={isDeletePending}
          error={deleteError}
        />
      )}
    </>
  )
}
