import { useNavigate, useParams } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { FloatingIp } from "@/server/Network/types/floatingIp"
import { useModal } from "@/client/utils/useModal"
import { STATUS_CONFIG } from "./constants"
import { EditFloatingIpModal } from "../-modals/EditFloatingIpModal"
import { DetachFloatingIpModal } from "../-modals/DetachFloatingIpModal"
import { ReleaseFloatingIpModal } from "../-modals/ReleaseFloatingIpModal"
import { AssociateFloatingIpModal } from "../-modals/AssociateFloatingIpModal"
import { useFloatingIpMutations } from "../../-hooks/useFloatingIpMutations"

interface FloatingIpTableRow {
  floatingIp: FloatingIp
}

export const FloatingIpTableRow = ({ floatingIp }: FloatingIpTableRow) => {
  const { t } = useLingui()
  const navigate = useNavigate()

  const [editModalOpen, toggleEditModal] = useModal(false)
  const [attachModalOpen, toggleAttachModal] = useModal(false)
  const [detachModalOpen, toggleDetachModal] = useModal(false)
  const [releaseModalOpen, toggleReleaseModal] = useModal(false)
  const { accountId, projectId } = useParams({ strict: false })

  const { handleUpdate, handleDelete, isUpdatePending, updateError, isDeletePending, deleteError } =
    useFloatingIpMutations()

  const navigateToDetailsPage = () => {
    if (!accountId || !projectId) return

    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/floatingips/$floatingIpId",
      params: { accountId, projectId, floatingIpId: floatingIp.id },
    })
  }

  return (
    <>
      <DataGridRow key={floatingIp.id} data-testid={`floating-ip-row-${floatingIp.id}`}>
        <DataGridCell>
          <div className="flex items-center gap-2">
            {STATUS_CONFIG[floatingIp.status].icon}
            {STATUS_CONFIG[floatingIp.status].text}
          </div>
        </DataGridCell>
        <DataGridCell>{floatingIp.floating_ip_address}</DataGridCell>
        <DataGridCell>{floatingIp.fixed_ip_address || "—"}</DataGridCell>
        <DataGridCell>{floatingIp.floating_network_id}</DataGridCell>
        <DataGridCell>{floatingIp.description || "—"}</DataGridCell>
        <DataGridCell onClick={(e) => e.stopPropagation()}>
          <PopupMenu>
            <PopupMenuOptions>
              <PopupMenuItem label={t`Preview`} onClick={navigateToDetailsPage} />
              <PopupMenuItem label={t`Edit Description`} onClick={toggleEditModal} />
              <PopupMenuItem label={t`Attach`} onClick={toggleAttachModal} />
              <PopupMenuItem label={t`Detach`} onClick={toggleDetachModal} />
              <PopupMenuItem label={t`Release`} onClick={toggleReleaseModal} />
            </PopupMenuOptions>
          </PopupMenu>
        </DataGridCell>
      </DataGridRow>

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
