import { Button, DataGridToolbar, SearchInput, Stack, Status } from "@cloudoperators/juno-ui-components"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { i18n } from "@lingui/core"
import { trpcReact } from "@/client/trpcClient"
import { useVolumePermissions } from "@/client/hooks/useVolumePermissions"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import type { Filter } from "@/client/components/ListToolbar/types"
import { VOLUME_STATUSES, SNAPSHOT_STATUSES } from "@/types/volume"
import { filterAndSortVolumes, type VolumeSearch } from "../-utils/list"
import { ResourceTable } from "./ResourceTable"
import { ResourceTabs } from "./ResourceTabs"
import { formatRelativeTime } from "@/client/utils/formatRelativeTime"
import { RouteError } from "@/client/components/Errors/RouteError"

export function ResourceList({ projectId, snapshots = false }: { projectId: string; snapshots?: boolean }) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as VolumeSearch
  const permissions = useVolumePermissions(projectId)
  const canList = snapshots ? permissions.canListSnapshots : permissions.canListVolumes
  const canRead = snapshots ? permissions.canReadSnapshots : permissions.canReadVolumes
  const queryOptions = { retry: false, refetchOnReconnect: false }
  const volumesQuery = trpcReact.volume.listVolumes.useQuery(
    { project_id: projectId },
    { ...queryOptions, enabled: !snapshots && canList }
  )
  const snapshotsQuery = trpcReact.volume.listSnapshots.useQuery(
    { project_id: projectId },
    { ...queryOptions, enabled: snapshots && canList }
  )
  const query = snapshots ? snapshotsQuery : volumesQuery
  const allItems = query.data ?? []
  const items = filterAndSortVolumes(allItems, search, snapshots)
  const filterKeys = snapshots ? ["status"] : ["status", "volume_type", "bootable", "availability_zone"]
  const selectedFilters = filterKeys.flatMap((name) => {
    const value = search[name as keyof VolumeSearch]
    return value ? [{ name, value }] : []
  })
  const updateSearch = (patch: Partial<VolumeSearch>) =>
    void navigate({
      to: snapshots ? "/projects/$projectId/volumes/snapshots" : "/projects/$projectId/volumes",
      params: { projectId },
      search: { ...search, ...patch },
      replace: true,
    })
  const distinct = (key: "volume_type" | "availability_zone") =>
    [
      ...new Set(volumesQuery.data?.map((volume) => volume[key]).filter((value): value is string => Boolean(value))),
    ].sort()
  const filters: Filter[] = [
    {
      displayName: t`Status`,
      filterName: "status",
      values: [...(snapshots ? SNAPSHOT_STATUSES : VOLUME_STATUSES), "other"],
      valueLabels: { other: t`Other` },
    },
    ...(!snapshots
      ? [
          { displayName: t`Volume type`, filterName: "volume_type", values: distinct("volume_type") },
          {
            displayName: t`Bootable`,
            filterName: "bootable",
            values: ["true", "false"],
            valueLabels: { true: t`Yes`, false: t`No` },
          },
          { displayName: t`Availability Zone`, filterName: "availability_zone", values: distinct("availability_zone") },
        ]
      : []),
  ]
  const hasActiveFilters = Boolean(search.search?.trim() || selectedFilters.length)
  const matchingCount = items.length
  const totalCount = allItems.length
  const lastUpdatedText =
    query.dataUpdatedAt && !query.isFetching ? formatRelativeTime(query.dataUpdatedAt, i18n.locale) : null

  if (permissions.isPending) return <Status status="progress" title={t`Loading Permissions...`} />
  if (permissions.error?.data?.code === "FORBIDDEN" || (!permissions.error && !canList))
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={
          snapshots
            ? t`You don't have permission to view snapshots in this project.`
            : t`You don't have permission to view volumes in this project.`
        }
      />
    )
  if (permissions.error)
    return (
      <Stack direction="vertical">
        <RouteError
          error={permissions.error}
          title={permissions.error.data?.code === "UNAUTHORIZED" ? t`Session Expired` : t`Failed to Load Permissions`}
        />
        <Button size="xs" label={t`Try again`} onClick={() => void permissions.refetch()} />
      </Stack>
    )

  return (
    <Stack direction="vertical" className="juno-pattern-datagrid-outer">
      <Stack direction="vertical" className="juno-pattern-datagrid-header">
        <Stack distribution="between" alignment="center" gap="2" wrap className="pb-2">
          <ResourceTabs projectId={projectId} snapshots={snapshots} />
          <SortInput
            options={[
              { value: "name", label: t`Name` },
              { value: "status", label: t`Status` },
              { value: "size", label: t`Size` },
              { value: "created_at", label: t`Created` },
            ]}
            sortBy={search.sortBy ?? "name"}
            sortDirection={search.sortDirection ?? "asc"}
            selectWidth="auto"
            selectClassName="min-w-40"
            onSortByChange={(value) => updateSearch({ sortBy: value as VolumeSearch["sortBy"] })}
            onSortDirectionChange={(sortDirection) => updateSearch({ sortDirection })}
          />
        </Stack>
        <DataGridToolbar>
          <Stack direction="vertical" gap="2">
            <Stack distribution="between" alignment="center" wrap>
              <FiltersInput
                filters={filters}
                onChange={({ name, value }) => updateSearch({ [name]: value || undefined })}
              />
              <SearchInput
                placeholder={t`Search…`}
                value={search.search ?? ""}
                onInput={(event) => updateSearch({ search: event.currentTarget.value || undefined })}
                onSearch={(value) => updateSearch({ search: typeof value === "string" ? value : undefined })}
                onClear={() => updateSearch({ search: undefined })}
              />
            </Stack>
            {selectedFilters.length > 0 && (
              <Stack gap="2" wrap alignment="start">
                <SelectedFilters
                  selectedFilters={selectedFilters}
                  filters={filters}
                  onDelete={({ name }) => updateSearch({ [name]: undefined })}
                  onClear={() => updateSearch(Object.fromEntries(filterKeys.map((key) => [key, undefined])))}
                />
                {selectedFilters.length === 1 && (
                  <Button
                    size="xs"
                    label={t`Clear all`}
                    onClick={() => updateSearch(Object.fromEntries(filterKeys.map((key) => [key, undefined])))}
                  />
                )}
              </Stack>
            )}
            <Stack distribution="between" alignment="center" className="text-theme-light text-sm">
              <span>
                {hasActiveFilters ? (
                  snapshots ? (
                    <Trans>
                      Showing {matchingCount} of {totalCount} snapshots
                    </Trans>
                  ) : (
                    <Trans>
                      Showing {matchingCount} of {totalCount} volumes
                    </Trans>
                  )
                ) : snapshots ? (
                  <Trans>Showing {matchingCount} snapshots</Trans>
                ) : (
                  <Trans>Showing {matchingCount} volumes</Trans>
                )}
              </span>
              {lastUpdatedText && (
                <span>
                  <Trans>Last updated: {lastUpdatedText}</Trans>
                </span>
              )}
            </Stack>
          </Stack>
        </DataGridToolbar>
      </Stack>
      {query.isPending ? (
        <Status status="progress" title={snapshots ? t`Loading Snapshots...` : t`Loading Volumes...`} />
      ) : query.error?.data?.code === "FORBIDDEN" ? (
        <Status
          status="error"
          title={t`Access Denied`}
          body={
            snapshots
              ? t`You don't have permission to view snapshots in this project.`
              : t`You don't have permission to view volumes in this project.`
          }
        />
      ) : query.error ? (
        <Stack direction="vertical">
          <RouteError
            error={query.error}
            title={
              query.error.data?.code === "UNAUTHORIZED"
                ? t`Session Expired`
                : snapshots
                  ? t`Failed to Load Snapshots`
                  : t`Failed to Load Volumes`
            }
          />
          <Button size="xs" label={t`Try again`} onClick={() => void query.refetch()} />
        </Stack>
      ) : items.length === 0 ? (
        <Status
          status={hasActiveFilters && allItems.length > 0 ? "no-matches" : "empty"}
          title={
            allItems.length > 0
              ? snapshots
                ? t`No Snapshots Match Your Filters`
                : t`No Volumes Match Your Filters`
              : snapshots
                ? t`No Snapshots in This Project`
                : t`No Volumes in This Project`
          }
          body={
            allItems.length > 0
              ? t`Change your search or filters to see more results.`
              : t`There are no resources to display.`
          }
        />
      ) : (
        <ResourceTable items={items} snapshots={snapshots} projectId={projectId} canRead={canRead} />
      )}
    </Stack>
  )
}
