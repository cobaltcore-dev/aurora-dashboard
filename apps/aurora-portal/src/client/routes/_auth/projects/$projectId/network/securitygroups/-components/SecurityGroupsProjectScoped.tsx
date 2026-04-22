import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { ListToolbar } from "@/client/components/ListToolbar"
import { buildFilterParams } from "@/client/utils/buildFilterParams"
import { useListWithFiltering } from "@/client/utils/useListWithFiltering"
import { useProjectId } from "@/client/hooks"
import { SecurityGroupListContainerProjectScoped } from "./SecurityGroupListContainerProjectScoped"
import { CreateSecurityGroupModal } from "@/client/routes/_auth/accounts/$accountId/projects/$projectId/network/-components/SecurityGroups/-components/-modals/CreateSecurityGroupModal"
import {
  CreateSecurityGroupInput,
  UpdateSecurityGroupInput,
} from "@/server/Network/types/securityGroup"

// Security group shared filter constants
const SECURITY_GROUP_SHARED = {
  TRUE: "true",
  FALSE: "false",
} as const

type SecurityGroupSortKey = "name" | "project_id"

/**
 * New Project-Scoped Security Groups List
 *
 * This component wraps the existing SecurityGroups component
 * but works with the new /projects/:projectId/... route structure
 * instead of /accounts/:accountId/projects/:projectId/...
 *
 * Key difference: Navigation doesn't require accountId
 */
export const SecurityGroupsProjectScoped = () => {
  const { t } = useLingui()
  const projectId = useProjectId()

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
    project_id: projectId || "",
    sort_key: sortSettings.sortBy,
    sort_dir: sortSettings.sortDirection,
    ...buildFilterParams(filterSettings),
    ...(searchTerm ? { searchTerm } : {}),
  }, {
    enabled: !!projectId,
  })

  const createSecurityGroupMutation = trpcReact.network.securityGroup.create.useMutation({
    onSuccess: () => {
      utils.network.securityGroup.list.invalidate()
      setCreateModalOpen(false)
      setCreateError(null)
    },
    onError: (error) => {
      setCreateError(error.message || t`Failed to create security group`)
    },
  })

  const deleteSecurityGroupMutation = trpcReact.network.securityGroup.deleteById.useMutation({
    onSuccess: () => {
      utils.network.securityGroup.list.invalidate()
      setDeleteError(null)
    },
    onError: (error) => {
      setDeleteError(error.message || t`Failed to delete security group`)
    },
  })

  const updateSecurityGroupMutation = trpcReact.network.securityGroup.update.useMutation({
    onSuccess: () => {
      utils.network.securityGroup.list.invalidate()
      setUpdateError(null)
    },
    onError: (error) => {
      setUpdateError(error.message || t`Failed to update security group`)
    },
  })

  const handleCreateSecurityGroup = async (securityGroupData: Omit<CreateSecurityGroupInput, "project_id">) => {
    setCreateError(null)
    await createSecurityGroupMutation.mutateAsync({ project_id: projectId, ...securityGroupData })
  }

  const handleDeleteSecurityGroup = (securityGroupId: string) => {
    setDeleteError(null)
    deleteSecurityGroupMutation.mutate({ project_id: projectId, securityGroupId })
  }

  const handleUpdateSecurityGroup = async (
    securityGroupId: string,
    data: Omit<UpdateSecurityGroupInput, "securityGroupId" | "project_id">
  ) => {
    setUpdateError(null)
    await updateSecurityGroupMutation.mutateAsync({ project_id: projectId, securityGroupId, ...data })
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

      <SecurityGroupListContainerProjectScoped
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
