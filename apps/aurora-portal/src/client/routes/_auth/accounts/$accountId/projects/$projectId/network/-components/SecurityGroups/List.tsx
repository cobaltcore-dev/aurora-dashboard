import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Button } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { ListToolbar } from "@/client/components/ListToolbar"
import { buildFilterParams } from "@/client/utils/buildFilterParams"
import { useListWithFiltering } from "@/client/utils/useListWithFiltering"
import { SecurityGroupListContainer } from "./-components/SecurityGroupListContainer"
import { CreateSecurityGroupModal } from "./-components/-modals/CreateSecurityGroupModal"
import { CreateSecurityGroupInput } from "@/server/Network/types/securityGroup"
import { SECURITY_GROUP_SHARED } from "./constants"

type SecurityGroupSortKey = "name" | "project_id"

export const SecurityGroups = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { accountId, projectId } = useParams({ strict: false })

  const [createModalOpen, setCreateModalOpen] = useState(false)

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
    canUpdate: true,
    canDelete: false,
    canManageAccess: true,
  }

  const {
    data: securityGroups = [],
    isLoading,
    isError,
    error,
  } = trpcReact.network.list.useQuery({
    sort_key: sortSettings.sortBy,
    sort_dir: sortSettings.sortDirection,
    ...buildFilterParams(filterSettings),
    ...(searchTerm ? { searchTerm } : {}),
  })

  const createSecurityGroupMutation = trpcReact.network.create.useMutation({
    onSuccess: (createdSecurityGroup) => {
      // Invalidate and refetch the security groups list
      utils.network.list.invalidate()

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
  })

  const handleCreateSecurityGroup = async (securityGroupData: CreateSecurityGroupInput) => {
    await createSecurityGroupMutation.mutateAsync(securityGroupData)
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
          permissions.canUpdate && (
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
      />

      <CreateSecurityGroupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateSecurityGroup}
        isLoading={createSecurityGroupMutation.isPending}
      />
    </div>
  )
}
