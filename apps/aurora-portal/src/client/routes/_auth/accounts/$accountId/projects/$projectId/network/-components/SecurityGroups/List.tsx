import { useState, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Button } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings, FilterSettings } from "@/client/components/ListToolbar/types"
import { SecurityGroupListContainer } from "./-components/SecurityGroupListContainer"
import { CreateSecurityGroupModal } from "./-components/-modals/CreateSecurityGroupModal"
import { CreateSecurityGroupInput } from "@/server/Network/types/securityGroup"
import { SECURITY_GROUP_SHARED } from "./constants"

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: string
  sortDirection: "asc" | "desc"
}

export const SecurityGroups = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { accountId, projectId } = useParams({ strict: false })

  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Project id`, value: "project_id" },
    ],
    sortBy: "name",
    sortDirection: "asc",
  })

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    filters: [
      {
        displayName: t`Shared`,
        filterName: "shared",
        values: Object.values(SECURITY_GROUP_SHARED),
        supportsMultiValue: false,
      },
    ],
  })

  const [searchTerm, setSearchTerm] = useState("")

  const utils = trpcReact.useUtils()

  /**
   * Builds filter parameters from current filter settings
   */
  const buildFilterParams = (): Record<string, string | boolean> => {
    const params: Record<string, string | boolean> = {}

    if (!filterSettings.selectedFilters?.length) return params

    filterSettings.selectedFilters
      .filter((sf) => !sf.inactive)
      .forEach((sf) => {
        if (sf.value === "true" || sf.value === "false") {
          params[sf.name] = sf.value === "true"
          return
        }
        params[sf.name] = sf.value
      })
    return params
  }

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
    ...buildFilterParams(),
    ...(searchTerm ? { searchTerm } : {}),
  })

  const createSecurityGroupMutation = trpcReact.network.create.useMutation({
    onSuccess: (createdSecurityGroup) => {
      // Invalidate and refetch the security groups list
      utils.network.list.invalidate()

      // Navigate to the details page of the newly created security group
      if (accountId && projectId) {
        navigate({
          to: "/accounts/$accountId/projects/$projectId/network/security-groups/$securityGroupId",
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

  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options ?? sortSettings.options,
      sortBy: (newSortSettings.sortBy?.toString() as string) || "name",
      sortDirection: (newSortSettings.sortDirection as "asc" | "desc") || "asc",
    }
    setSortSettings(settings)
  }

  const handleFilterChange = (newFilterSettings: FilterSettings) => {
    startTransition(() => {
      setFilterSettings(newFilterSettings)
    })
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    startTransition(() => {
      setSearchTerm(searchValue)
    })
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
