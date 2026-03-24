import { useState, useMemo } from "react"
import { trpcReact } from "@/client/trpcClient"
import type { UpdateSecurityGroupInput, CreateSecurityGroupRuleInput } from "@/server/Network/types/securityGroup"
import type { RulesFilterControls } from "../-components/SecurityGroupDetailsView"

interface UseSecurityGroupDetailsParams {
  securityGroupId: string
  filterControls: RulesFilterControls
}

export function useSecurityGroupDetails({ securityGroupId, filterControls }: UseSecurityGroupDetailsParams) {
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

  // Client-side filtering and sorting of rules
  const filteredAndSortedRules = useMemo(() => {
    const allRules = securityGroupQuery.data?.security_group_rules || []
    let result = allRules

    // Extract filters from filterSettings
    const directionFilter = filterControls.filterSettings.selectedFilters?.find((f) => f.name === "direction")?.value
    const ethertypeFilter = filterControls.filterSettings.selectedFilters?.find((f) => f.name === "ethertype")?.value
    const protocolFilter = filterControls.filterSettings.selectedFilters?.find((f) => f.name === "protocol")?.value

    // Filter by direction
    if (directionFilter && directionFilter !== "all") {
      result = result.filter((rule) => rule.direction === directionFilter)
    }

    // Filter by ethertype
    if (ethertypeFilter && ethertypeFilter !== "all") {
      result = result.filter((rule) => rule.ethertype === ethertypeFilter)
    }

    // Filter by protocol
    if (protocolFilter && protocolFilter !== "all") {
      result = result.filter((rule) => {
        // Handle null protocol as "any"
        if (rule.protocol === null) {
          return false
        }
        return rule.protocol === protocolFilter
      })
    }

    // Filter by search term
    if (filterControls.searchTerm) {
      const searchLower = filterControls.searchTerm.toLowerCase()
      result = result.filter(
        (rule) =>
          rule.description?.toLowerCase().includes(searchLower) ||
          rule.protocol?.toLowerCase().includes(searchLower) ||
          rule.ethertype?.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    if (filterControls.sortSettings.sortBy) {
      const sortKey = filterControls.sortSettings.sortBy as "direction" | "protocol" | "description"
      result = [...result].sort((a, b) => {
        const aValue = (a[sortKey] || "") as string
        const bValue = (b[sortKey] || "") as string
        const comparison = aValue.localeCompare(bValue)
        return filterControls.sortSettings.sortDirection === "asc" ? comparison : -comparison
      })
    }

    return result
  }, [securityGroupQuery.data?.security_group_rules, filterControls])

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

  // Create rule mutation
  const createRuleMutation = trpcReact.network.securityGroupRule.create.useMutation({
    onSuccess: () => {
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

  const handleCreateRule = async (ruleData: CreateSecurityGroupRuleInput) => {
    await createRuleMutation.mutateAsync(ruleData)
  }

  return {
    // Data
    securityGroup: securityGroupQuery.data,
    filteredAndSortedRules,

    // Query states
    isLoading: securityGroupQuery.isPending,
    isError: securityGroupQuery.isError,
    error: securityGroupQuery.error,

    // Mutation states
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message || null,
    isDeletingRule: deleteRuleMutation.isPending,
    deleteRuleError: deleteRuleMutation.error?.message || null,
    isCreatingRule: createRuleMutation.isPending,
    createRuleError: createRuleMutation.error?.message || null,

    // Modal states
    editModalOpen,

    // Handlers
    handleEdit,
    handleCloseEditModal,
    handleUpdate,
    handleDeleteRule,
    handleCreateRule,
  }
}
