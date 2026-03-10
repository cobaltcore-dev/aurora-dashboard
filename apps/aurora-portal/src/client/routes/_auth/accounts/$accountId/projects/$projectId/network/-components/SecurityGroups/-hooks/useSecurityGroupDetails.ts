import { useState } from "react"
import { trpcReact } from "@/client/trpcClient"
import type { UpdateSecurityGroupInput } from "@/server/Network/types/securityGroup"

interface UseSecurityGroupDetailsParams {
  securityGroupId: string
}

export function useSecurityGroupDetails({ securityGroupId }: UseSecurityGroupDetailsParams) {
  const [editModalOpen, setEditModalOpen] = useState(false)

  const utils = trpcReact.useUtils()

  // Query for security group
  // Use cached data from list page if available (instant loading)
  const securityGroupQuery = trpcReact.network.securityGroup.getById.useQuery(
    {
      securityGroupId,
    },
    {
      // Use cached data from list page as placeholder while fetching
      placeholderData: () => {
        return utils.network.securityGroup.getById.getData({ securityGroupId })
      },
    }
  )

  // Update mutation
  const updateMutation = trpcReact.network.securityGroup.update.useMutation({
    onSuccess: () => {
      utils.network.securityGroup.getById.invalidate({ securityGroupId })
      utils.network.securityGroup.list.invalidate()
      setEditModalOpen(false)
    },
  })

  // Delete rule mutation
  const deleteRuleMutation = trpcReact.network.securityGroupRule.delete.useMutation({
    onSuccess: () => {
      // Invalidate the security group query to refresh the rules list
      utils.network.securityGroup.getById.invalidate({ securityGroupId })
      utils.network.securityGroup.list.invalidate()
    },
  })

  // Handlers
  const handleEdit = () => {
    setEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setEditModalOpen(false)
  }

  const handleUpdate = async (id: string, data: Omit<UpdateSecurityGroupInput, "securityGroupId">) => {
    await updateMutation.mutateAsync({
      securityGroupId: id,
      ...data,
    })
  }

  const handleDeleteRule = async (ruleId: string) => {
    await deleteRuleMutation.mutateAsync({ ruleId })
  }

  return {
    // Data
    securityGroup: securityGroupQuery.data,

    // Query states
    isLoading: securityGroupQuery.isPending,
    isError: securityGroupQuery.isError,
    error: securityGroupQuery.error,

    // Mutation states
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message || null,
    isDeletingRule: deleteRuleMutation.isPending,
    deleteRuleError: deleteRuleMutation.error?.message || null,

    // Modal states
    editModalOpen,

    // Handlers
    handleEdit,
    handleCloseEditModal,
    handleUpdate,
    handleDeleteRule,
  }
}
