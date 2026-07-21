import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { Button, Stack, DataGridToolbar, SearchInput } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { SecurityGroupListContainer } from "./SecurityGroupListContainer"
import { CreateSecurityGroupModal } from "./-modals/CreateSecurityGroupModal"
import { CreateSecurityGroupInput, UpdateSecurityGroupInput } from "@/server/Network/types/securityGroup"
import { parseFiltersFromUrl, buildFilterParams, buildUrlSearchParams, applyFilterSelection } from "../urlHelpers"
import { useSecurityGroupPermissions } from "../-hooks/useSecurityGroupPermissions"

type SecurityGroupSortKey = "name" | "project_id"

type SecurityGroupsSearchParams = {
  shared?: string
  search?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
}

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: string
  sortDirection: "asc" | "desc"
}

interface SecurityGroupsProps {
  project: string
}

export const SecurityGroups = ({ project: projectId }: SecurityGroupsProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as SecurityGroupsSearchParams

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Project id`, value: "project_id" },
    ],
    sortBy: searchParams.sortBy || "name",
    sortDirection: searchParams.sortDirection || "asc",
  })

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    filters: [
      {
        displayName: t`Shared`,
        filterName: "shared",
        values: ["true", "false"],
        supportsMultiValue: false,
      },
    ],
    selectedFilters: parseFiltersFromUrl(searchParams),
  })

  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const utils = trpcReact.useUtils()

  // Sync local state with URL changes (e.g., browser back/forward)
  useEffect(() => {
    setSortSettings((prev) => ({
      ...prev,
      sortBy: searchParams.sortBy || "name",
      sortDirection: searchParams.sortDirection || "asc",
    }))
    setFilterSettings((prev) => ({
      ...prev,
      selectedFilters: parseFiltersFromUrl(searchParams),
    }))
    setSearchTerm(searchParams.search || "")
  }, [searchParams.sortBy, searchParams.sortDirection, searchParams.search, searchParams.shared])

  const urlFilters = parseFiltersFromUrl(searchParams)
  const urlSortBy = (searchParams.sortBy || "name") as SecurityGroupSortKey
  const urlSortDirection = searchParams.sortDirection || "asc"
  const urlSearchTerm = searchParams.search || ""

  const {
    data: securityGroupsData,
    isLoading,
    isError,
    error,
  } = trpcReact.network.securityGroup.list.useQuery(
    {
      project_id: projectId || "",
      sort_key: urlSortBy,
      sort_dir: urlSortDirection,
      ...buildFilterParams(urlFilters, filterSettings.filters),
      ...(urlSearchTerm ? { searchTerm: urlSearchTerm } : {}),
    },
    {
      refetchOnWindowFocus: false,
    }
  )

  const securityGroups = securityGroupsData || []
  const listError =
    isError && error?.data?.code === "FORBIDDEN" ? t`You do not have permission to view security groups` : null

  const { permissions } = useSecurityGroupPermissions(projectId)

  const createSecurityGroupMutation = trpcReact.network.securityGroup.create.useMutation({
    onSuccess: (createdSecurityGroup) => {
      utils.network.securityGroup.list.invalidate()
      utils.network.securityGroup.getById.invalidate()
      setCreateError(null)
      navigate({
        to: "/projects/$projectId/network/securitygroups/$securityGroupId",
        params: {
          projectId,
          securityGroupId: createdSecurityGroup.id,
        },
      })
    },
    onError: (error) => {
      setCreateError(error.message || t`Failed to create security group`)
    },
  })

  const deleteSecurityGroupMutation = trpcReact.network.securityGroup.deleteById.useMutation({
    onSuccess: () => {
      utils.network.securityGroup.list.invalidate()
      utils.network.securityGroup.getById.invalidate()
      setDeleteError(null)
    },
    onError: (error) => {
      setDeleteError(error.message || t`Failed to delete security group`)
    },
  })

  const updateSecurityGroupMutation = trpcReact.network.securityGroup.update.useMutation({
    onSuccess: () => {
      utils.network.securityGroup.list.invalidate()
      utils.network.securityGroup.getById.invalidate()
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

  const handleClearUpdateError = () => {
    setUpdateError(null)
  }

  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options,
      sortBy: newSortSettings.sortBy?.toString() || "name",
      sortDirection: newSortSettings.sortDirection || "asc",
    }
    setSortSettings(settings)
    navigate({
      search: ((prev: SecurityGroupsSearchParams) => ({
        ...prev,
        sortBy: settings.sortBy,
        sortDirection: settings.sortDirection,
      })) as unknown as true,
      replace: true,
    })
  }

  const handleFilterChange = (newFilterSettings: FilterSettings) => {
    setFilterSettings(newFilterSettings)
    navigate({
      search: ((prev: SecurityGroupsSearchParams) =>
        buildUrlSearchParams(newFilterSettings.selectedFilters || [], newFilterSettings.filters, {
          search: prev.search,
          sortBy: prev.sortBy,
          sortDirection: prev.sortDirection,
        })) as unknown as true,
      replace: true,
    })
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    setSearchTerm(searchValue)
    navigate({
      search: ((prev: SecurityGroupsSearchParams) => ({
        ...prev,
        search: searchValue || undefined,
      })) as unknown as true,
      replace: true,
    })
  }

  if (isLoading) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        <Trans>Loading...</Trans>
      </Stack>
    )
  }

  if (isError && !securityGroups.length) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        {listError || t`Failed to load security groups`}
      </Stack>
    )
  }

  return (
    <>
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        <Stack gap="2">
          <SortInput
            options={sortSettings.options}
            sortBy={sortSettings.sortBy}
            sortDirection={sortSettings.sortDirection ?? "asc"}
            onSortByChange={(v) =>
              handleSortChange({ ...sortSettings, sortBy: v, sortDirection: sortSettings.sortDirection })
            }
            onSortDirectionChange={(dir) => handleSortChange({ ...sortSettings, sortDirection: dir })}
          />
          {permissions.canCreate && (
            <Button onClick={() => setCreateModalOpen(true)} variant="primary" className="whitespace-nowrap">
              <Trans>Create Security Group</Trans>
            </Button>
          )}
        </Stack>
      </Stack>

      <DataGridToolbar>
        <Stack direction="vertical" gap="2">
          <Stack distribution="between" alignment="center">
            <FiltersInput
              filters={filterSettings.filters}
              onChange={(selected) => {
                const newSelected = applyFilterSelection(
                  filterSettings.selectedFilters || [],
                  selected,
                  filterSettings.filters
                )
                if (newSelected === (filterSettings.selectedFilters || [])) return
                handleFilterChange({ ...filterSettings, selectedFilters: newSelected })
              }}
            />
            <SearchInput
              placeholder={t`Search security groups...`}
              data-testid="searchbar"
              value={searchTerm}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const v = e.currentTarget.value
                setSearchTerm(v)
              }}
              onSearch={(v) => {
                handleSearchChange(typeof v === "string" ? v : "")
              }}
              onClear={() => {
                setSearchTerm("")
                handleSearchChange("")
              }}
            />
          </Stack>
          {filterSettings.selectedFilters && filterSettings.selectedFilters.length > 0 && (
            <SelectedFilters
              selectedFilters={filterSettings.selectedFilters}
              onDelete={(filterToRemove) =>
                handleFilterChange({
                  ...filterSettings,
                  selectedFilters: (filterSettings.selectedFilters || []).filter(
                    (f) => !(f.name === filterToRemove.name && f.value === filterToRemove.value)
                  ),
                })
              }
              onClear={() => handleFilterChange({ ...filterSettings, selectedFilters: [] })}
            />
          )}
        </Stack>
      </DataGridToolbar>

      <SecurityGroupListContainer
        securityGroups={securityGroups}
        isLoading={false}
        isError={false}
        error={null}
        permissions={permissions}
        onCreateClick={() => setCreateModalOpen(true)}
        onDeleteSecurityGroup={handleDeleteSecurityGroup}
        isDeletingSecurityGroup={deleteSecurityGroupMutation.isPending}
        deleteError={deleteError}
        onUpdateSecurityGroup={handleUpdateSecurityGroup}
        isUpdatingSecurityGroup={updateSecurityGroupMutation.isPending}
        updateError={updateError}
        currentProjectId={projectId}
        hasAnyBulkAction={false}
        onClearUpdateError={handleClearUpdateError}
      />

      <CreateSecurityGroupModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateError(null)
          setCreateModalOpen(false)
        }}
        onCreate={handleCreateSecurityGroup}
        isLoading={createSecurityGroupMutation.isPending}
        error={createError}
      />
    </>
  )
}
