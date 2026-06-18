import { useState, useEffect, useRef, Suspense, use, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { ErrorBoundary } from "react-error-boundary"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { Button, Stack, DataGridToolbar, SearchInput, Message, Spinner } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { useProjectId } from "@/client/hooks"
import { SecurityGroupListContainer } from "./SecurityGroupListContainer"
import { CreateSecurityGroupModal } from "./-modals/CreateSecurityGroupModal"
import { CreateSecurityGroupInput, UpdateSecurityGroupInput, SecurityGroup } from "@/server/Network/types/securityGroup"
import { parseFiltersFromUrl, buildFilterParams, buildUrlSearchParams, applyFilterSelection } from "../urlHelpers"

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

type SecurityGroupsResult = {
  securityGroups: SecurityGroup[]
  listError?: string
}

type SecurityGroupsContentProps = {
  securityGroupsPromise: Promise<SecurityGroupsResult>
  permissionsPromise: Promise<{
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    canManageAccess: boolean
  }>
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortSettings: SortSettings
  handleSortChange: (settings: SortSettings) => void
  filterSettings: FilterSettings
  handleFilterChange: (settings: FilterSettings) => void
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
  deleteError: string | null
  createError: string | null
  updateError: string | null
  onCreateSecurityGroup: (data: Omit<CreateSecurityGroupInput, "project_id">) => Promise<void>
  onDeleteSecurityGroup: (id: string) => void
  onUpdateSecurityGroup: (id: string, data: Omit<UpdateSecurityGroupInput, "securityGroupId" | "project_id">) => void
  isDeletingSecurityGroup: boolean
  isUpdatingSecurityGroup: boolean
  currentProjectId: string
  isFetching: boolean
}

function SecurityGroupsContent({
  securityGroupsPromise,
  permissionsPromise,
  searchTerm,
  setSearchTerm,
  sortSettings,
  handleSortChange,
  filterSettings,
  handleFilterChange,
  createModalOpen,
  setCreateModalOpen,
  deleteError,
  createError,
  updateError,
  onCreateSecurityGroup,
  onDeleteSecurityGroup,
  onUpdateSecurityGroup,
  isDeletingSecurityGroup,
  isUpdatingSecurityGroup,
  currentProjectId,
  isFetching,
}: SecurityGroupsContentProps) {
  const { t } = useLingui()
  const data = use(securityGroupsPromise)
  const permissions = use(permissionsPromise)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debounceTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  if (data.listError) {
    return <p>{data.listError}</p>
  }

  const securityGroups = data.securityGroups

  return (
    <>
      {/* Zone 1 — sort + create button, no background */}
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

      {/* Zone 2 — filter + search + active filter pills */}
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
              value={localSearchTerm}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const v = e.currentTarget.value
                setLocalSearchTerm(v)
                clearTimeout(debounceTimer.current)
                debounceTimer.current = window.setTimeout(() => setSearchTerm(v), 500)
              }}
              onSearch={(v) => {
                clearTimeout(debounceTimer.current)
                setSearchTerm(typeof v === "string" ? v : "")
              }}
              onClear={() => {
                clearTimeout(debounceTimer.current)
                setLocalSearchTerm("")
                setSearchTerm("")
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
        isLoading={isFetching}
        isError={false}
        error={null}
        permissions={permissions}
        onCreateClick={() => setCreateModalOpen(true)}
        onDeleteSecurityGroup={onDeleteSecurityGroup}
        isDeletingSecurityGroup={isDeletingSecurityGroup}
        deleteError={deleteError}
        onUpdateSecurityGroup={onUpdateSecurityGroup}
        isUpdatingSecurityGroup={isUpdatingSecurityGroup}
        updateError={updateError}
        currentProjectId={currentProjectId}
        hasAnyBulkAction={false}
      />

      <CreateSecurityGroupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={onCreateSecurityGroup}
        isLoading={false}
        error={createError}
      />
    </>
  )
}

export const SecurityGroups = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()
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
  const [isFetching, setIsFetching] = useState(true)

  const utils = trpcReact.useUtils()

  // Create promises for Suspense
  const [securityGroupsPromise, setSecurityGroupsPromise] = useState<Promise<SecurityGroupsResult>>(
    () =>
      new Promise(() => {
        // Placeholder: replaced immediately by useEffect on mount
      }) as Promise<SecurityGroupsResult>
  )

  const permissionsPromise = Promise.resolve({
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageAccess: true,
  })

  const createSecurityGroupMutation = trpcReact.network.securityGroup.create.useMutation({
    onSuccess: (createdSecurityGroup) => {
      utils.network.securityGroup.list.invalidate()
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

  // Fetch security groups when URL params change
  useEffect(() => {
    const urlFilters = parseFiltersFromUrl(searchParams)
    const urlSortBy = searchParams.sortBy || "name"
    const urlSortDirection = searchParams.sortDirection || "asc"
    const urlSearchTerm = searchParams.search || ""

    setFilterSettings((prev) => ({ ...prev, selectedFilters: urlFilters }))
    setSortSettings((prev) => ({ ...prev, sortBy: urlSortBy, sortDirection: urlSortDirection }))
    setSearchTerm(urlSearchTerm)

    setIsFetching(true)
    startTransition(() => {
      const newPromise = (async (): Promise<SecurityGroupsResult> => {
        try {
          const result = await utils.network.securityGroup.list.fetch({
            project_id: projectId || "",
            sort_key: urlSortBy as SecurityGroupSortKey,
            sort_dir: urlSortDirection,
            ...buildFilterParams(urlFilters, filterSettings.filters),
            ...(urlSearchTerm ? { searchTerm: urlSearchTerm } : {}),
          })
          return { securityGroups: result }
        } catch (error: unknown) {
          if (error && typeof error === "object" && "data" in error) {
            const trpcError = error as { data?: { code?: string } }
            if (trpcError.data?.code === "FORBIDDEN") {
              return { securityGroups: [], listError: t`You do not have permission to view security groups` }
            }
          }
          throw error
        }
      })()
      newPromise.catch(() => {}).finally(() => setIsFetching(false))
      setSecurityGroupsPromise(newPromise)
    })
  }, [searchParams.shared, searchParams.sortBy, searchParams.sortDirection, searchParams.search, projectId, t, utils])

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

  return (
    <div className="relative">
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Message variant="error" text={error instanceof Error ? error.message : t`An unexpected error occurred.`} />
        )}
      >
        <Suspense
          fallback={
            <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
              <Spinner variant="primary" size="large" className="mb-2" />
              <Trans>Loading Security Groups...</Trans>
            </Stack>
          }
        >
          <SecurityGroupsContent
            securityGroupsPromise={securityGroupsPromise}
            permissionsPromise={permissionsPromise}
            searchTerm={searchTerm}
            setSearchTerm={handleSearchChange}
            sortSettings={sortSettings}
            handleSortChange={handleSortChange}
            filterSettings={filterSettings}
            handleFilterChange={handleFilterChange}
            createModalOpen={createModalOpen}
            setCreateModalOpen={setCreateModalOpen}
            deleteError={deleteError}
            createError={createError}
            updateError={updateError}
            onCreateSecurityGroup={handleCreateSecurityGroup}
            onDeleteSecurityGroup={handleDeleteSecurityGroup}
            onUpdateSecurityGroup={handleUpdateSecurityGroup}
            isDeletingSecurityGroup={deleteSecurityGroupMutation.isPending}
            isUpdatingSecurityGroup={updateSecurityGroupMutation.isPending}
            currentProjectId={projectId}
            isFetching={isFetching}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
