import { useState, useMemo } from "react"
import { toast } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import type { UpdateSecurityGroupInput, CreateSecurityGroupRuleInput } from "@/server/Network/types/securityGroup"
import type { RulesFilterControls } from "../-components/SecurityGroupDetailsView"
import { getRuleRemote, useFormatRuleRemote, type SecurityGroupOption } from "../-components/ruleRemote"
import {
  getSecurityGroupDeletedToast,
  getSecurityGroupUpdatedToast,
  getSecurityGroupRuleCreatedToast,
  getSecurityGroupRuleDeletedToast,
} from "../../-components/SecurityGroupToastNotifications"

interface UseSecurityGroupDetailsParams {
  securityGroupId: string
  filterControls: RulesFilterControls
  securityGroups?: SecurityGroupOption[]
}

export function useSecurityGroupDetails({
  securityGroupId,
  filterControls,
  securityGroups = [],
}: UseSecurityGroupDetailsParams) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const projectId = useProjectId()

  const utils = trpcReact.useUtils()

  // Query for security group
  // Use cached data from list page if available (instant loading)
  const securityGroupQuery = trpcReact.network.securityGroup.getById.useQuery(
    {
      project_id: projectId,
      securityGroupId,
    },
    {
      // Use cached data from list page as placeholder while fetching
      placeholderData: () => {
        return utils.network.securityGroup.getById.getData({ project_id: projectId, securityGroupId })
      },
    }
  )

  // Client-side filtering and sorting of rules
  const formatRuleRemote = useFormatRuleRemote()

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
          rule.ethertype?.toLowerCase().includes(searchLower) ||
          // The remote as the Remote column shows it, so whatever the table displays can be searched for
          formatRuleRemote(getRuleRemote(rule, securityGroups)).toLowerCase().includes(searchLower)
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
  }, [securityGroupQuery.data?.security_group_rules, filterControls, securityGroups, formatRuleRemote])

  // Update mutation
  const updateMutation = trpcReact.network.securityGroup.update.useMutation({
    onSuccess: (_, variables) => {
      utils.network.securityGroup.getById.invalidate({ project_id: projectId, securityGroupId })
      utils.network.securityGroup.list.invalidate()
      const { message, ...options } = getSecurityGroupUpdatedToast(
        variables.name || securityGroupQuery.data?.name || securityGroupId
      )
      toast.success(message, options)
      setEditModalOpen(false)
    },
  })

  // Delete security group mutation
  const deleteMutation = trpcReact.network.securityGroup.deleteById.useMutation({
    onSuccess: () => {
      utils.network.securityGroup.list.invalidate()
      const { message, ...options } = getSecurityGroupDeletedToast(securityGroupQuery.data?.name || securityGroupId)
      toast.success(message, options)
      setDeleteModalOpen(false)
    },
  })

  // Delete rule mutation
  const deleteRuleMutation = trpcReact.network.securityGroupRule.delete.useMutation({
    onSuccess: () => {
      // Invalidate the security group query to refresh the rules list
      utils.network.securityGroup.getById.invalidate({ project_id: projectId, securityGroupId })
      utils.network.securityGroup.list.invalidate()
      const { message, ...options } = getSecurityGroupRuleDeletedToast()
      toast.success(message, options)
    },
  })

  // Create rule mutation
  const createRuleMutation = trpcReact.network.securityGroupRule.create.useMutation({
    onSuccess: () => {
      utils.network.securityGroup.getById.invalidate({ project_id: projectId, securityGroupId })
      utils.network.securityGroup.list.invalidate()
      const { message, ...options } = getSecurityGroupRuleCreatedToast()
      toast.success(message, options)
    },
  })

  // Handlers
  const handleEdit = () => {
    setEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setEditModalOpen(false)
    updateMutation.reset()
  }

  const handleDelete = () => {
    setDeleteModalOpen(true)
  }

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false)
    deleteMutation.reset()
  }

  const handleDeleteSecurityGroup = async () => {
    await deleteMutation.mutateAsync({ project_id: projectId, securityGroupId })
  }

  const handleUpdate = async (id: string, data: Omit<UpdateSecurityGroupInput, "securityGroupId" | "project_id">) => {
    await updateMutation.mutateAsync({
      project_id: projectId,
      securityGroupId: id,
      ...data,
    })
  }

  const handleDeleteRule = (ruleId: string) => {
    deleteRuleMutation.mutate({ project_id: projectId, ruleId })
  }

  const handleCreateRule = async (ruleData: Omit<CreateSecurityGroupRuleInput, "project_id">) => {
    await createRuleMutation.mutateAsync({ project_id: projectId, ...ruleData })
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
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message || null,
    isDeletingRule: deleteRuleMutation.isPending,
    deleteRuleError: deleteRuleMutation.error?.message || null,
    isCreatingRule: createRuleMutation.isPending,
    createRuleError: createRuleMutation.error?.message || null,

    // Modal states
    editModalOpen,
    deleteModalOpen,

    // Handlers
    handleEdit,
    handleCloseEditModal,
    handleUpdate,
    handleDelete,
    handleCloseDeleteModal,
    handleDeleteSecurityGroup,
    handleDeleteRule,
    handleCreateRule,
    clearCreateRuleError: createRuleMutation.reset,
    clearDeleteRuleError: deleteRuleMutation.reset,
  }
}
