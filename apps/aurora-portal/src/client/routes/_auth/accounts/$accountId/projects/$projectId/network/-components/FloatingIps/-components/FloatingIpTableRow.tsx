import { useNavigate, useParams } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIp } from "@/server/Network/types/floatingIp"
import { STATUS_CONFIG } from "./constants"
import {
  EditFloatingIpModal,
  FloatingIpUpdateFields,
} from "../../../floatingips/-components/-modals/EditFloatingIpModal"
import { useModal } from "../../../floatingips/-hooks/useModal"
import { DetachFloatingIpModal } from "../../../floatingips/-components/-modals/DetachFloatingIpModal"
import { ReleaseFloatingIpModal } from "../../../floatingips/-components/-modals/ReleaseFloatingIpModal"
import { AssociateFloatingIpModal } from "../../../floatingips/-components/-modals/AssociateFloatingIpModal"

interface FloatingIpTableRow {
  floatingIp: FloatingIp
}

export const FloatingIpTableRow = ({ floatingIp }: FloatingIpTableRow) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const utils = trpcReact.useUtils()
  const [editModalOpen, toggleEditModal] = useModal(false)
  const [attachModalOpen, toggleAttachModal] = useModal(false)
  const [detachModalOpen, toggleDetachModal] = useModal(false)
  const [releaseModalOpen, toggleReleaseModal] = useModal(false)
  const { accountId, projectId } = useParams({ strict: false })

  const updateFloatingIpMutation = trpcReact.network.floatingIp.update.useMutation({
    onMutate: async (variables) => {
      await utils.network.floatingIp.list.cancel()
      await utils.network.floatingIp.getById.cancel({ floatingip_id: variables.floatingip_id })
      const previousItem = utils.network.floatingIp.getById.getData({ floatingip_id: variables.floatingip_id })
      utils.network.floatingIp.getById.setData({ floatingip_id: variables.floatingip_id }, (old) =>
        old
          ? {
              ...old,
              port_id: variables.port_id,
              ...(variables.fixed_ip_address !== undefined && { fixed_ip_address: variables.fixed_ip_address }),
              ...(variables.description !== undefined && { description: variables.description }),
              ...(variables.distributed !== undefined && { distributed: variables.distributed }),
            }
          : old
      )
      return { previousItem }
    },
    onError: (_err, variables, context) => {
      if (context?.previousItem !== undefined) {
        utils.network.floatingIp.getById.setData({ floatingip_id: variables.floatingip_id }, context.previousItem)
      }
    },
    onSettled: (_data, _error, variables) => {
      utils.network.floatingIp.list.invalidate()
      utils.network.floatingIp.getById.invalidate({ floatingip_id: variables.floatingip_id })
    },
  })

  const deleteFloatingIpMutation = trpcReact.network.floatingIp.delete.useMutation({
    onMutate: async () => {
      await utils.network.floatingIp.list.cancel()
    },
    onSettled: () => {
      utils.network.floatingIp.list.invalidate()
    },
  })

  const handleDeleteFloatingIp = async (floatingIpId: string) => {
    await deleteFloatingIpMutation.mutateAsync({
      floatingip_id: floatingIpId,
    })
  }

  const handleUpdateFloatingIp = async (floatingIpId: string, data: FloatingIpUpdateFields) => {
    await updateFloatingIpMutation.mutateAsync({
      floatingip_id: floatingIpId,
      ...data,
    })
  }

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
          onUpdate={handleUpdateFloatingIp}
          isLoading={updateFloatingIpMutation.isPending}
          error={updateFloatingIpMutation.error?.message ?? null}
        />
      )}

      {attachModalOpen && (
        <AssociateFloatingIpModal
          floatingIp={floatingIp}
          open={attachModalOpen}
          onClose={toggleAttachModal}
          onUpdate={handleUpdateFloatingIp}
          isLoading={updateFloatingIpMutation.isPending}
          error={updateFloatingIpMutation.error?.message ?? null}
        />
      )}

      {detachModalOpen && (
        <DetachFloatingIpModal
          floatingIp={floatingIp}
          open={detachModalOpen}
          onClose={toggleDetachModal}
          onUpdate={handleUpdateFloatingIp}
          isLoading={updateFloatingIpMutation.isPending}
          error={updateFloatingIpMutation.error?.message ?? null}
        />
      )}

      {releaseModalOpen && (
        <ReleaseFloatingIpModal
          floatingIp={floatingIp}
          open={releaseModalOpen}
          onClose={toggleReleaseModal}
          onUpdate={handleDeleteFloatingIp}
          isLoading={deleteFloatingIpMutation.isPending}
          error={deleteFloatingIpMutation.error?.message ?? null}
        />
      )}
    </>
  )
}
