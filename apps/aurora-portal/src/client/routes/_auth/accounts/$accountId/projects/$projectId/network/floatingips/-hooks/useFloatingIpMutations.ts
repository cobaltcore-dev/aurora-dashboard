import { trpcReact } from "@/client/trpcClient"
import type { FloatingIpUpdateFields } from "../-components/-modals/EditFloatingIpModal"

export const useFloatingIpMutations = () => {
  const utils = trpcReact.useUtils()

  const updateMutation = trpcReact.network.floatingIp.update.useMutation({
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
      utils.network.floatingIp.getById.invalidate({ floatingip_id: variables.floatingip_id })
      utils.network.floatingIp.list.invalidate()
    },
  })

  const deleteMutation = trpcReact.network.floatingIp.delete.useMutation({
    onMutate: async () => {
      await utils.network.floatingIp.list.cancel()
    },
    onSettled: () => {
      utils.network.floatingIp.list.invalidate()
    },
  })

  const handleUpdate = async (floatingIpId: string, data: FloatingIpUpdateFields) => {
    await updateMutation.mutateAsync({
      floatingip_id: floatingIpId,
      ...data,
    })
  }

  const handleDelete = async (floatingIpId: string) => {
    await deleteMutation.mutateAsync({
      floatingip_id: floatingIpId,
    })
  }

  return {
    handleUpdate,
    handleDelete,
    isUpdatePending: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,
    isDeletePending: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message ?? null,
  }
}
