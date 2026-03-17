import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Button } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { ListToolbar } from "@/client/components/ListToolbar"
import { buildFilterParams } from "@/client/utils/buildFilterParams"
import { useListWithFiltering } from "@/client/utils/useListWithFiltering"
import { SecurityGroupListContainer } from "./-components/SecurityGroupListContainer"
import { CreateSecurityGroupModal } from "./-components/-modals/CreateSecurityGroupModal"
import { CreateSecurityGroupInput, UpdateSecurityGroupInput } from "@/server/Network/types/securityGroup"
import { SECURITY_GROUP_SHARED } from "./constants"

type SecurityGroupSortKey = "name" | "project_id"

export const SecurityGroups = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { accountId, projectId } = useParams({ strict: false })

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const { searchTerm, sortSettings, filterSettings, handleSearchChange, handleSortChange, handleFilterChange } =
    useListWithFiltering<SecurityGroupSortKey>({
      defaultSortKey: "name",
      defaultSortDir: "asc",
      sortOptions: [
        { label: t`Name`, value: "name" },
        { label: t`Project id`, value: "project_id" },
      ],
      filterSettings: {
        filters: [
          {
            displayName: t`Shared`,
            filterName: "shared",
            values: Object.values(SECURITY_GROUP_SHARED),
            supportsMultiValue: false,
          },
        ],
      },
    })

  const utils = trpcReact.useUtils()

  // TODO: replace with trpc.network.canUser when security group permissions are available
  const permissions = {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageAccess: true,
  }

  const {
    data: securityGroups = [],
    isLoading,
    isError,
    error,
  } = trpcReact.network.securityGroup.list.useQuery({
    project_id: projectId,
    sort_key: sortSettings.sortBy,
    sort_dir: sortSettings.sortDirection,
    ...buildFilterParams(filterSettings),
    ...(searchTerm ? { searchTerm } : {}),
  })

  // Cache each security group individually for instant navigation to details page
  useEffect(() => {
    if (securityGroups.length > 0) {
      securityGroups.forEach((sg) => {
        utils.network.securityGroup.getById.setData({ securityGroupId: sg.id }, sg)
      })
    }
  }, [securityGroups, utils])

  const createSecurityGroupMutation = trpcReact.network.securityGroup.create.useMutation({
    onSuccess: (createdSecurityGroup) => {
      // Invalidate and refetch the security groups list
      utils.network.securityGroup.list.invalidate()
      setCreateError(null)

      // Navigate to the details page of the newly created security group
      if (accountId && projectId) {
        navigate({
          to: "/accounts/$accountId/projects/$projectId/network/securitygroups/$securityGroupId",
          params: {
            accountId,
            projectId,
            securityGroupId: createdSecurityGroup.id,
          },
        })
      }
    },
    onError: (error) => {
      // Backend handles error parsing, just display the message
      setCreateError(error.message || t`Failed to create security group`)
    },
  })

  const deleteSecurityGroupMutation = trpcReact.network.securityGroup.deleteById.useMutation({
    onSuccess: () => {
      // Invalidate and refetch the security groups list
      utils.network.securityGroup.list.invalidate()
      setDeleteError(null)
    },
    onError: (error) => {
      // Backend handles error parsing, just display the message
      setDeleteError(error.message || t`Failed to delete security group`)
    },
  })

  const updateSecurityGroupMutation = trpcReact.network.securityGroup.update.useMutation({
    onSuccess: () => {
      // Invalidate and refetch the security groups list
      utils.network.securityGroup.list.invalidate()
      setUpdateError(null)
    },
    onError: (error) => {
      // Backend handles error parsing, just display the message
      setUpdateError(error.message || t`Failed to update security group`)
    },
  })

  const handleCreateSecurityGroup = async (securityGroupData: CreateSecurityGroupInput) => {
    setCreateError(null)
    await createSecurityGroupMutation.mutateAsync(securityGroupData)
  }

  const handleDeleteSecurityGroup = (securityGroupId: string) => {
    setDeleteError(null)
    deleteSecurityGroupMutation.mutate({ securityGroupId })
  }

  const handleUpdateSecurityGroup = async (
    securityGroupId: string,
    data: Omit<UpdateSecurityGroupInput, "securityGroupId">
  ) => {
    setUpdateError(null)
    await updateSecurityGroupMutation.mutateAsync({ securityGroupId, ...data })
  }

  return (
    <div className="relative">
      <ListToolbar
        sortSettings={sortSettings}
        filterSettings={filterSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onFilter={handleFilterChange}
        onSearch={handleSearchChange}
        actions={
          permissions.canCreate && (
            <Button onClick={() => setCreateModalOpen(true)} variant="primary">
              <Trans>Create Security Group</Trans>
            </Button>
          )
        }
      />

      <SecurityGroupListContainer
        securityGroups={securityGroups}
        isLoading={isLoading}
        isError={isError}
        error={error}
        permissions={permissions}
        onCreateClick={() => setCreateModalOpen(true)}
        onDeleteSecurityGroup={handleDeleteSecurityGroup}
        isDeletingSecurityGroup={deleteSecurityGroupMutation.isPending}
        deleteError={deleteError}
        onUpdateSecurityGroup={handleUpdateSecurityGroup}
        isUpdatingSecurityGroup={updateSecurityGroupMutation.isPending}
        updateError={updateError}
      />

      <CreateSecurityGroupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateSecurityGroup}
        isLoading={createSecurityGroupMutation.isPending}
        error={createError}
      />
    </div>
  )
}
