import { forwardRef, useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { trpcReact } from "@/client/trpcClient"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Spinner,
  Stack,
  PopupMenu,
  PopupMenuItem,
  PopupMenuToggle,
  PopupMenuOptions,
  Button,
  ButtonProps,
} from "@cloudoperators/juno-ui-components/index"
import { ListToolbar } from "@/client/components/ListToolbar"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { ImageListView } from "./-components/ImageListView"
import { CONTAINER_FORMATS, DISK_FORMATS, IMAGE_STATUSES, IMAGE_VISIBILITY } from "../../-constants/filters"

export const Images = () => {
  const { t } = useLingui()

  const [selectedImages, setSelectedImages] = useState<Array<string>>([])
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
  const [deactivateAllModalOpen, setDeactivateAllModalOpen] = useState(false)
  const [activateAllModalOpen, setActivateAllModalOpen] = useState(false)

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    filters: [
      {
        displayName: t`Status`,
        filterName: "status",
        values: Object.values(IMAGE_STATUSES),
        supportsMultiValue: true, // ✅ Can use: status=in:active,queued
      },
      {
        displayName: t`Visibility`,
        filterName: "visibility",
        values: Object.values(IMAGE_VISIBILITY),
        supportsMultiValue: false, // ❌ Cannot use 'in' operator
      },
      {
        displayName: t`Disk Format`,
        filterName: "disk_format",
        values: Object.values(DISK_FORMATS),
        supportsMultiValue: true, // ✅ Can use: disk_format=in:qcow2,raw
      },
      {
        displayName: t`Container Format`,
        filterName: "container_format",
        values: Object.values(CONTAINER_FORMATS),
        supportsMultiValue: true, // ✅ Can use: container_format=in:bare,ovf
      },
      {
        displayName: t`Protected`,
        filterName: "protected",
        values: ["true", "false"],
        supportsMultiValue: false, // ❌ Cannot use 'in' operator
      },
    ],
  })

  const [searchTerm, setSearchTerm] = useState("")

  const [sortSettings, setSortSettings] = useState<SortSettings>({
    options: [
      {
        label: t`Created At`,
        value: "created_at",
      },
      {
        label: t`Updated At`,
        value: "updated_at",
      },
      {
        label: t`Name`,
        value: "name",
      },
      {
        label: t`Size`,
        value: "size",
      },
      {
        label: t`Status`,
        value: "status",
      },
    ],
    sortBy: "created_at",
    sortDirection: "desc",
  })

  const utils = trpcReact.useUtils()

  /**
   * Builds filter parameters from current filter settings
   * Handles both single-value and multi-value filters based on supportsMultiValue flag
   *
   * @returns Object with filter parameters for the API request
   */
  const buildFilterParams = (): Record<string, string> => {
    const params: Record<string, string> = {}

    if (!filterSettings.selectedFilters?.length) return params

    // Group selected filters by filter name
    const filterGroups = filterSettings.selectedFilters
      .filter((sf) => !sf.inactive) // Exclude inactive filters
      .reduce(
        (acc, sf) => {
          if (!acc[sf.name]) acc[sf.name] = []
          acc[sf.name].push(sf.value)
          return acc
        },
        {} as Record<string, string[]>
      )

    // Build parameters based on whether filter supports multiple values
    Object.entries(filterGroups).forEach(([filterName, values]) => {
      const filterDef = filterSettings.filters.find((f) => f.filterName === filterName)

      if (filterDef?.supportsMultiValue && values.length > 1) {
        // Multi-value filter: use 'in' operator (e.g., status=in:active,queued)
        params[filterName] = `in:${values.join(",")}`
      } else {
        // Single-value filter or only one value selected (e.g., visibility=public)
        params[filterName] = values[0]
      }
    })

    return params
  }

  /**
   * Fetches images with pagination, sorting, and filtering
   *
   * OpenStack Glance API supports:
   * - Sorting: sort=field:direction (new syntax) or sort_key & sort_dir (classic)
   * - Filtering: Direct comparison (name=value) or 'in' operator (name=in:value1,value2)
   * - Search: name parameter for text search
   */
  const fetchImages = async ({ pageParam }: { pageParam?: string }) => {
    // If pageParam exists, only pass 'next' (it already contains limit and other params)
    // Otherwise, pass the initial query params with limit, sort, filter, and search parameters
    const params = pageParam
      ? { next: pageParam }
      : {
          limit: 15,
          // Sorting: use new syntax for cleaner URLs
          sort: `${sortSettings.sortBy}:${sortSettings.sortDirection}`,
          // Filters: add all active filter parameters
          ...buildFilterParams(),
          // Search: add name filter if search term exists
          ...(searchTerm && { name: searchTerm }),
        }

    return await utils.client.compute.listImagesWithPagination.query(params)
  }

  const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, status } = useInfiniteQuery({
    /**
     * Query key includes sort, filter, and search settings to trigger refetch when they change
     * This ensures the data is re-fetched whenever the user changes any filter, sort, or search
     */
    queryKey: [
      ["compute", "listImagesWithPagination"],
      {
        input: {
          limit: 15,
          sort: `${sortSettings.sortBy}:${sortSettings.sortDirection}`,
          filters: buildFilterParams(),
          search: searchTerm,
        },
        type: "query",
      },
    ],
    queryFn: fetchImages,
    getNextPageParam: (lastPage) => {
      // Return the full next URL from the API response
      // The next URL should already include the sort and filter parameters from the initial request
      return lastPage.next ?? undefined
    },
    initialPageParam: undefined,
  })

  const { data: canCreate } = trpcReact.compute.canUser.useQuery("images:create")
  const { data: canDelete } = trpcReact.compute.canUser.useQuery("images:delete")
  const { data: canEdit } = trpcReact.compute.canUser.useQuery("images:update")

  if (status === "pending") {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Images...</Trans>
      </Stack>
    )
  }

  if (status === "error") {
    const errorMessage = error.message

    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Trans>Error: {errorMessage}</Trans>
      </Stack>
    )
  }

  const permissions = {
    canCreate: canCreate ?? false,
    canDelete: canDelete ?? false,
    canEdit: canEdit ?? false,
  }

  // Flatten all pages into a single array
  const images = data.pages.flatMap((page) => page.images)

  const deletableImages = selectedImages.filter((imageId) => !images.find((image) => image.id === imageId)?.protected)
  const protectedImages = selectedImages.filter((imageId) => images.find((image) => image.id === imageId)?.protected)
  const activeImages = selectedImages.filter(
    (imageId) => images.find((image) => image.id === imageId)?.status === "active"
  )
  const deactivatedImages = selectedImages.filter(
    (imageId) => images.find((image) => image.id === imageId)?.status === "deactivated"
  )

  const isDeleteAllDisabled =
    !permissions.canDelete ||
    images.filter((image) => selectedImages.includes(image.id)).every((image) => image.protected)
  const isDeactivateAllDisabled =
    !permissions.canEdit ||
    images.filter((image) => selectedImages.includes(image.id)).every((image) => image.status === "deactivated")
  const isActivateAllDisabled =
    !permissions.canEdit ||
    images.filter((image) => selectedImages.includes(image.id)).every((image) => image.status === "active")
  return (
    <ImageListView
      images={images}
      permissions={permissions}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      isFetching={isFetching}
      selectedImages={selectedImages}
      setSelectedImages={setSelectedImages}
      deleteAllModalOpen={deleteAllModalOpen}
      setDeleteAllModalOpen={setDeleteAllModalOpen}
      deactivateAllModalOpen={deactivateAllModalOpen}
      setDeactivateAllModalOpen={setDeactivateAllModalOpen}
      activateAllModalOpen={activateAllModalOpen}
      setActivateAllModalOpen={setActivateAllModalOpen}
      deletableImages={deletableImages}
      protectedImages={protectedImages}
      activeImages={activeImages}
      deactivatedImages={deactivatedImages}
    >
      <ListToolbar
        sortSettings={sortSettings}
        filterSettings={filterSettings}
        searchTerm={searchTerm}
        onSort={setSortSettings}
        onFilter={setFilterSettings}
        onSearch={setSearchTerm}
        actions={
          selectedImages.length > 0 ? (
            <PopupMenu>
              <PopupMenuToggle
                as={forwardRef<HTMLButtonElement, ButtonProps>(({ onClick = undefined, ...props }, ref) => (
                  <Button icon="moreVert" ref={ref} onClick={onClick} {...props}>
                    {t`More Actions`}
                  </Button>
                ))}
              />
              <PopupMenuOptions>
                <PopupMenuItem
                  disabled={isDeleteAllDisabled}
                  label={t`Delete All`}
                  onClick={() => setDeleteAllModalOpen(true)}
                />
                <PopupMenuItem
                  disabled={isDeactivateAllDisabled}
                  label={t`Deactivate All`}
                  onClick={() => setDeactivateAllModalOpen(true)}
                />
                <PopupMenuItem
                  disabled={isActivateAllDisabled}
                  label={t`Activate All`}
                  onClick={() => setActivateAllModalOpen(true)}
                />
              </PopupMenuOptions>
            </PopupMenu>
          ) : null
        }
      />
    </ImageListView>
  )
}
