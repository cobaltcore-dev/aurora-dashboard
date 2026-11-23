import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  PortalProvider,
  Status,
  Stack,
  DataGridToolbar,
  SearchInput,
  Button,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import type { Filter, SelectedFilter, SortSettings } from "@/client/components/ListToolbar/types"
import { useKubernetesPermissions } from "../-hooks/useKubernetesPermissions"
import { ClusterListRow } from "./ClusterListRow"
import type { KubernetesLandscape } from "@/types/kubernetes"

interface ClusterListProps {
  projectId: string
  landscape: KubernetesLandscape
}

export function ClusterList({ projectId, landscape }: ClusterListProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as {
    search?: string
    sortBy?: string
    sortDirection?: "asc" | "desc"
    status?: string
  }

  const [localSearchTerm, setLocalSearchTerm] = useState(searchParams.search || "")

  // Sort configuration
  const sortOptions = [
    { label: t`Name`, value: "name" },
    { label: t`Status`, value: "status" },
    { label: t`Kubernetes Version`, value: "version" },
    { label: t`Readiness`, value: "readiness" },
  ]

  // Filter configuration
  const filters: Filter[] = [
    {
      displayName: t`Status`,
      filterName: "status",
      values: ["healthy", "progressing", "unhealthy", "unknown"],
      valueLabels: {
        healthy: t`Healthy`,
        progressing: t`Progressing`,
        unhealthy: t`Unhealthy`,
        unknown: t`Unknown`,
      },
      supportsMultiValue: false,
    },
  ]

  const selectedFilters: SelectedFilter[] = searchParams.status ? [{ name: "status", value: searchParams.status }] : []

  const {
    permissions,
    isLoading: permissionsLoading,
    isError: permissionsError,
    error: permissionsErrorObj,
  } = useKubernetesPermissions(projectId, landscape)

  const {
    data: clusters,
    isLoading: clustersLoading,
    isError: clustersError,
    error: clustersErrorObj,
  } = trpcReact.kubernetes.clusters.list.useQuery(
    { project_id: projectId, landscape },
    {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      enabled: !permissionsLoading && !permissionsError && permissions.clusters.list,
    }
  )

  const handleCreateCluster = () => {
    // Placeholder for T-08 create cluster functionality
    console.log("Create cluster clicked")
  }

  // Client-side filtering, sorting, and searching
  const filteredAndSortedClusters = useMemo(() => {
    if (!clusters) return []

    let result = [...clusters]

    // Apply status filter
    if (searchParams.status) {
      result = result.filter((cluster) => cluster.status === searchParams.status)
    }

    // Apply search filter
    const searchTerm = (searchParams.search || "").toLowerCase()
    if (searchTerm) {
      result = result.filter(
        (cluster) =>
          cluster.name.toLowerCase().includes(searchTerm) ||
          cluster.uid?.toLowerCase().includes(searchTerm) ||
          cluster.version?.toLowerCase().includes(searchTerm)
      )
    }

    // Apply sorting
    const sortBy = searchParams.sortBy || "name"
    const sortDirection = searchParams.sortDirection || "asc"

    result.sort((a, b) => {
      let aVal: string | undefined
      let bVal: string | undefined

      switch (sortBy) {
        case "name":
          aVal = a.name
          bVal = b.name
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "version":
          aVal = a.version
          bVal = b.version
          break
        case "readiness":
          aVal = a.readiness?.status
          bVal = b.readiness?.status
          break
        default:
          aVal = a.name
          bVal = b.name
      }

      const compareResult = (aVal || "").localeCompare(bVal || "")
      return sortDirection === "asc" ? compareResult : -compareResult
    })

    return result
  }, [clusters, searchParams.status, searchParams.search, searchParams.sortBy, searchParams.sortDirection])

  const handleSortChange = (newSettings: SortSettings) => {
    void navigate({
      search: (prev) =>
        ({
          ...prev,
          sortBy: newSettings.sortBy?.toString(),
          sortDirection: newSettings.sortDirection,
        }) as never,
      replace: true,
    })
  }

  const handleFilterChange = (newSelected: SelectedFilter[]) => {
    const statusFilter = newSelected.find((f) => f.name === "status")
    void navigate({
      search: (prev) =>
        ({
          ...prev,
          status: statusFilter?.value,
        }) as never,
      replace: true,
    })
  }

  const handleSearchChange = (term: string) => {
    void navigate({
      search: (prev) =>
        ({
          ...prev,
          search: term || undefined,
        }) as never,
      replace: true,
    })
  }

  const handleSearchInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value
    setLocalSearchTerm(value)
    // Debounce would go here, but for simplicity we'll update immediately
    handleSearchChange(value)
  }

  const handleDeleteFilter = (filterToRemove: SelectedFilter) => {
    const newFilters = selectedFilters.filter(
      (f) => !(f.name === filterToRemove.name && f.value === filterToRemove.value)
    )
    handleFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    handleFilterChange([])
  }

  const hasActiveFilters = !!searchParams.status || !!searchParams.search
  const isEmpty = !clusters || clusters.length === 0
  const isEmptyFiltered = !isEmpty && filteredAndSortedClusters.length === 0 && hasActiveFilters

  // Loading state - either permissions or clusters
  if (permissionsLoading || (clustersLoading && permissions.clusters.list)) {
    return <Status status="progress" title={t`Loading clusters...`} />
  }

  // Permissions error
  if (permissionsError) {
    return (
      <Status
        status="error"
        title={t`Failed to load permissions`}
        body={permissionsErrorObj?.message ?? t`An error occurred while loading permissions.`}
      />
    )
  }

  // Access denied - user lacks permission to list clusters
  if (!permissions.clusters.list) {
    return (
      <Status
        status="error"
        code={403}
        title={t`Access Denied`}
        body={t`You do not have permission to list clusters.`}
      />
    )
  }

  // Clusters query error
  if (clustersError) {
    return (
      <Status
        status="error"
        title={t`Failed to load clusters`}
        body={clustersErrorObj?.message ?? t`An error occurred while loading clusters.`}
      />
    )
  }

  // Empty state
  if (isEmpty) {
    return (
      <Status
        status="empty"
        title={t`No clusters`}
        body={t`There are no Kubernetes clusters in this project for the selected landscape.`}
      />
    )
  }

  return (
    <PortalProvider>
      <Stack direction="vertical" className="juno-pattern-datagrid-outer">
        <Stack direction="vertical" className="juno-pattern-datagrid-header">
          {/* Zone 1: sort + primary action */}
          <Stack distribution="end" alignment="center" gap="2" className="pb-2">
            <Stack gap="2">
              <SortInput
                options={sortOptions}
                sortBy={searchParams.sortBy || "name"}
                sortDirection={searchParams.sortDirection || "asc"}
                selectClassName="min-w-52"
                onSortByChange={(v) =>
                  handleSortChange({
                    options: sortOptions,
                    sortBy: v,
                    sortDirection: searchParams.sortDirection || "asc",
                  })
                }
                onSortDirectionChange={(dir) =>
                  handleSortChange({
                    options: sortOptions,
                    sortBy: searchParams.sortBy || "name",
                    sortDirection: dir,
                  })
                }
              />
              <Button variant="primary" onClick={handleCreateCluster}>
                {t`Create Cluster`}
              </Button>
            </Stack>
          </Stack>

          {/* Zone 2: filters and search */}
          <DataGridToolbar>
            <Stack direction="vertical" gap="2">
              <Stack distribution="between" alignment="center">
                <FiltersInput
                  filters={filters}
                  selectClassName="sm:min-w-40"
                  comboboxClassName="sm:min-w-40"
                  onChange={(selected) => {
                    // Replace existing filter for the same name (single-value filter)
                    const newFilters = selectedFilters.filter((f) => f.name !== selected.name)
                    newFilters.push(selected)
                    handleFilterChange(newFilters)
                  }}
                />
                <SearchInput
                  className="w-60 sm:w-68"
                  placeholder={t`Search...`}
                  value={localSearchTerm}
                  onInput={handleSearchInput}
                  onClear={() => {
                    setLocalSearchTerm("")
                    handleSearchChange("")
                  }}
                />
              </Stack>
              {selectedFilters.length > 0 && (
                <SelectedFilters
                  filters={filters}
                  selectedFilters={selectedFilters}
                  onDelete={handleDeleteFilter}
                  onClear={handleClearFilters}
                />
              )}
            </Stack>
          </DataGridToolbar>
        </Stack>

        <DataGrid columns={6} minContentColumns={[5]}>
          <DataGridRow>
            <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Readiness`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Last Operation`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Kubernetes Version`}</DataGridHeadCell>
            <DataGridHeadCell />
          </DataGridRow>
          {isEmptyFiltered ? (
            <DataGridRow>
              <DataGridCell colSpan={6}>
                <Status
                  status="empty"
                  title={t`No matches`}
                  body={t`No clusters match your current filters or search.`}
                />
              </DataGridCell>
            </DataGridRow>
          ) : (
            filteredAndSortedClusters.map((cluster) => (
              <ClusterListRow
                key={cluster.uid ?? cluster.name}
                cluster={cluster}
                projectId={projectId}
                landscape={landscape}
              />
            ))
          )}
        </DataGrid>
      </Stack>
    </PortalProvider>
  )
}
