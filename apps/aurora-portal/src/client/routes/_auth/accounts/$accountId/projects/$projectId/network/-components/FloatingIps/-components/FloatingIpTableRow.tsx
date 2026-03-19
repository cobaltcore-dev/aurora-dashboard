import { useCallback, useState } from "react"
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
import type { FloatingIpUpdateRequest } from "@/server/Network/types/floatingIp"
import { STATUS_CONFIG } from "./constants"
import { EditFloatingIpModal } from "../../../floatingips/-components/-modals/EditFloatingIpModal"

interface FloatingIpTableRow {
  floatingIp: FloatingIp
}

export const FloatingIpTableRow = ({ floatingIp }: FloatingIpTableRow) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const utils = trpcReact.useUtils()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const { accountId, projectId } = useParams({ strict: false })

  const toggleEditModal = useCallback(() => {
    setEditModalOpen((open) => !open)
  }, [])

  const updateFloatingIpMutation = trpcReact.network.floatingIp.update.useMutation({
    onSuccess: () => {
      utils.network.floatingIp.list.invalidate()
      utils.network.floatingIp.getById.invalidate({ floatingip_id: floatingIp.id })
    },
  })

  const handleUpdateFloatingIp = async (floatingIpId: string, data: Omit<FloatingIpUpdateRequest, "floatingip_id">) => {
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
              <PopupMenuItem label={t`Attach`} disabled />
              <PopupMenuItem label={t`Detach`} disabled />
              <PopupMenuItem label={t`Release`} disabled />
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
    </>
  )
}
