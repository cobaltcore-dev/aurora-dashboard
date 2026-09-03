import type { ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { toast } from "@cloudoperators/juno-ui-components"
import { useModal } from "@/client/utils/useModal"
import { useProjectId } from "@/client/hooks"
import { useFloatingIpMutations } from "../../-hooks/useFloatingIpMutations"
import { AssociateFloatingIpModal } from "./AssociateFloatingIpModal"
import { DetachFloatingIpModal } from "./DetachFloatingIpModal"
import { EditFloatingIpModal } from "./EditFloatingIpModal"
import { ReleaseFloatingIpModal } from "./ReleaseFloatingIpModal"
import {
  getFloatingIpUpdatedToast,
  getFloatingIpAssociatedToast,
  getFloatingIpDetachedToast,
  getFloatingIpReleasedToast,
} from "./FloatingIpToastNotifications"
import type { FloatingIpUpdateFields } from "./EditFloatingIpModal"

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
  const navigate = useNavigate()
  const projectId = useProjectId()
  const [editModalOpen, toggleEditModal] = useModal(false)
  const [attachModalOpen, toggleAttachModal] = useModal(false)
  const [detachModalOpen, toggleDetachModal] = useModal(false)
  const [releaseModalOpen, toggleReleaseModal] = useModal(false)

  const { handleUpdate, handleDelete, resetUpdateError, isUpdatePending, updateError, isDeletePending, deleteError } =
    useFloatingIpMutations()

  const toggleEditModalWithReset = () => {
    resetUpdateError()
    toggleEditModal()
  }

  const toggleAttachModalWithReset = () => {
    resetUpdateError()
    toggleAttachModal()
  }

  const toggleDetachModalWithReset = () => {
    resetUpdateError()
    toggleDetachModal()
  }

  const ip = floatingIp.floating_ip_address ?? floatingIp.id

  const handleEditWithToast = async (floatingIpId: string, data: FloatingIpUpdateFields) => {
    await handleUpdate(floatingIpId, data)
    const { message, ...options } = getFloatingIpUpdatedToast(ip)
    toast.success(message, options)
  }

  const handleAssociateWithToast = async (floatingIpId: string, data: FloatingIpUpdateFields) => {
    await handleUpdate(floatingIpId, data)
    const { message, ...options } = getFloatingIpAssociatedToast(ip)
    toast.success(message, options)
  }

  const handleDetachWithToast = async (floatingIpId: string, data: FloatingIpUpdateFields) => {
    await handleUpdate(floatingIpId, data)
    const { message, ...options } = getFloatingIpDetachedToast(ip)
    toast.success(message, options)
  }

  const handleReleaseWithToast = async (floatingIpId: string) => {
    await handleDelete(floatingIpId)
    const { message, ...options } = getFloatingIpReleasedToast(ip)
    toast.success(message, options)
    navigate({
      to: "/projects/$projectId/network/floatingips",
      params: { projectId },
    })
  }

  return (
    <>
      {children({
        toggleEditModal: toggleEditModalWithReset,
        toggleAttachModal: toggleAttachModalWithReset,
        toggleDetachModal: toggleDetachModalWithReset,
        toggleReleaseModal,
      })}

      {editModalOpen && (
        <EditFloatingIpModal
          floatingIp={floatingIp}
          open={editModalOpen}
          onClose={toggleEditModalWithReset}
          onUpdate={handleEditWithToast}
          isLoading={isUpdatePending}
          error={updateError}
        />
      )}

      {attachModalOpen && (
        <AssociateFloatingIpModal
          floatingIp={floatingIp}
          open={attachModalOpen}
          onClose={toggleAttachModalWithReset}
          onUpdate={handleAssociateWithToast}
          isLoading={isUpdatePending}
          error={updateError}
        />
      )}

      {detachModalOpen && (
        <DetachFloatingIpModal
          floatingIp={floatingIp}
          open={detachModalOpen}
          onClose={toggleDetachModalWithReset}
          onUpdate={handleDetachWithToast}
          isLoading={isUpdatePending}
          error={updateError}
        />
      )}

      {releaseModalOpen && (
        <ReleaseFloatingIpModal
          floatingIp={floatingIp}
          open={releaseModalOpen}
          onClose={toggleReleaseModal}
          onUpdate={handleReleaseWithToast}
          isLoading={isDeletePending}
          error={deleteError}
        />
      )}
    </>
  )
}
