import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ListToolbar } from "@/client/components/ListToolbar"
import { buildFilterParams } from "@/client/utils/buildFilterParams"
import { useListWithFiltering } from "@/client/utils/useListWithFiltering"
import { SecurityGroupListContainer } from "./-components/SecurityGroupListContainer"
import { SECURITY_GROUP_SHARED } from "./constants"

type SecurityGroupSortKey = "name" | "project_id"

export const SecurityGroups = () => {
  const { t } = useLingui()

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

  return (
    <div className="relative">
      <ListToolbar
        sortSettings={sortSettings}
        filterSettings={filterSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onFilter={handleFilterChange}
        onSearch={handleSearchChange}
      />

      <SecurityGroupListContainer
        securityGroups={securityGroups}
        isLoading={isLoading}
        isError={isError}
        error={error}
        permissions={permissions}
      />
    </div>
  )
}
