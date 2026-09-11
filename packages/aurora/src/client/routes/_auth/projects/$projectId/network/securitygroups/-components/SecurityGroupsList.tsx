import { useState, useEffect, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { Button, Stack, DataGridToolbar, SearchInput, Message, toast } from "@cloudoperators/juno-ui-components"
import { CreateSecurityGroupInput, UpdateSecurityGroupInput } from "@/server/Network/types/securityGroup"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { trpcReact } from "@/client/trpcClient"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { SecurityGroupListContainer } from "./SecurityGroupListContainer"
import { CreateSecurityGroupModal } from "./-modals/CreateSecurityGroupModal"
import { useSecurityGroupPermissions } from "../-hooks/useSecurityGroupPermissions"
import { parseFiltersFromUrl, buildUrlSearchParams, applyFilterSelection } from "../urlHelpers"
import { buildSecurityGroupFilterParams, buildSecurityGroupFilters } from "../filterConfig"
import {
  getSecurityGroupDeletedToast,
  getSecurityGroupDeleteErrorToast,
  getSecurityGroupUpdatedToast,
  getSecurityGroupUpdateErrorToast,
} from "./SecurityGroupToastNotifications"

const SEARCH_DEBOUNCE_MS = 500

type SecurityGroupSortKey = "name" | "project_id"

type SecurityGroupsSearchParams = {
  shared?: string
  stateful?: string
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
    options: [{ label: t`Name`, value: "name" }],
    sortBy: searchParams.sortBy || "name",
    sortDirection: searchParams.sortDirection || "asc",
  })

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    filters: buildSecurityGroupFilters({ shared: t`Shared`, stateful: t`Stateful`, yes: t`Yes`, no: t`No` }),
    selectedFilters: parseFiltersFromUrl(searchParams),
  })

  const [localSearchTerm, setLocalSearchTerm] = useState(searchParams.search || "")
  const debounceTimer = useRef<number | undefined>(undefined)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const utils = trpcReact.useUtils()

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

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
    // Only sync the input from the URL when there's no debounced search "in flight" — otherwise
    // this effect would clobber characters the user typed while the debounce timer was pending.
    if (debounceTimer.current === undefined) {
      setLocalSearchTerm(searchParams.search || "")
    }
  }, [searchParams.sortBy, searchParams.sortDirection, searchParams.search, searchParams.shared, searchParams.stateful])

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
      ...buildSecurityGroupFilterParams(urlFilters),
      ...(urlSearchTerm ? { searchTerm: urlSearchTerm } : {}),
    },
    {
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev,
    }
  )

  const securityGroups = securityGroupsData || []
  const listError = isError
    ? error?.data?.code === "FORBIDDEN"
      ? t`You do not have permission to view security groups`
      : error.message || t`Failed to load security groups`
    : null

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
      const { message, ...options } = getSecurityGroupDeleteErrorToast(error.message)
      toast.error(message, options)
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
      const { message, ...options } = getSecurityGroupUpdateErrorToast(error.message)
      toast.error(message, options)
    },
  })

  const handleCreateSecurityGroup = async (securityGroupData: Omit<CreateSecurityGroupInput, "project_id">) => {
    setCreateError(null)
    try {
      await createSecurityGroupMutation.mutateAsync({ project_id: projectId, ...securityGroupData })
    } catch {
      // onError handles error state and UI feedback
    }
  }

  const handleDeleteSecurityGroup = (securityGroupId: string) => {
    setDeleteError(null)
    const sgName = securityGroups.find((sg) => sg.id === securityGroupId)?.name || securityGroupId
    deleteSecurityGroupMutation.mutate(
      { project_id: projectId, securityGroupId },
      {
        onSuccess: () => {
          const { message, ...options } = getSecurityGroupDeletedToast(sgName)
          toast.success(message, options)
        },
      }
    )
  }

  const handleUpdateSecurityGroup = async (
    securityGroupId: string,
    data: Omit<UpdateSecurityGroupInput, "securityGroupId" | "project_id">
  ) => {
    setUpdateError(null)
    const sgName = data.name || securityGroups.find((sg) => sg.id === securityGroupId)?.name || securityGroupId
    try {
      await updateSecurityGroupMutation.mutateAsync({ project_id: projectId, securityGroupId, ...data })
      const { message, ...options } = getSecurityGroupUpdatedToast(sgName)
      toast.success(message, options)
    } catch {
      // onError handles error state and UI feedback
    }
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

  const handleSearchChange = (term: string) => {
    navigate({
      search: ((prev: SecurityGroupsSearchParams) => ({
        ...prev,
        search: term || undefined,
      })) as unknown as true,
      replace: true,
    })
  }

  return (
    <>
      <ContentHeader title={t`Security Groups`} projectId={projectId} />

      <div className="relative">
        {/* Non-blocking error banner for refetch failures with cached data */}
        {isError && securityGroups.length > 0 && (
          <Message variant="error" className="mb-4">
            {listError}
          </Message>
        )}

        <Stack distribution="end" alignment="center" gap="2" className="pb-2">
          <Stack gap="2">
            <SortInput
              options={sortSettings.options}
              sortBy={sortSettings.sortBy}
              sortDirection={sortSettings.sortDirection ?? "asc"}
              selectClassName="min-w-40"
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
                selectClassName="sm:min-w-40"
                comboboxClassName="sm:min-w-40"
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
                // The wrapper is inline-block/w-auto and the input reserves pr-16 for its icons, so at
                // the browser's default input width this placeholder gets cut off mid-ellipsis.
                className="w-60 sm:w-68"
                placeholder={t`Search security groups...`}
                data-testid="searchbar"
                value={localSearchTerm}
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  const v = e.currentTarget.value
                  setLocalSearchTerm(v)
                  clearTimeout(debounceTimer.current)
                  debounceTimer.current = window.setTimeout(() => {
                    debounceTimer.current = undefined
                    handleSearchChange(v)
                  }, SEARCH_DEBOUNCE_MS)
                }}
                onSearch={(v) => {
                  clearTimeout(debounceTimer.current)
                  debounceTimer.current = undefined
                  handleSearchChange(typeof v === "string" ? v : "")
                }}
                onClear={() => {
                  clearTimeout(debounceTimer.current)
                  debounceTimer.current = undefined
                  setLocalSearchTerm("")
                  handleSearchChange("")
                }}
              />
            </Stack>
            {filterSettings.selectedFilters && filterSettings.selectedFilters.length > 0 && (
              <SelectedFilters
                selectedFilters={filterSettings.selectedFilters}
                filters={filterSettings.filters}
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
          isLoading={isLoading}
          isError={isError && securityGroups.length === 0}
          error={listError ? { message: listError } : null}
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
      </div>
    </>
  )
}
