import { forwardRef, useState, startTransition } from "react"
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
import {
  CONTAINER_FORMATS,
  DISK_FORMATS,
  IMAGE_STATUSES,
  IMAGE_VISIBILITY,
  MEMBER_STATUSES,
} from "../../-constants/filters"

// Define the custom toggle button component outside
const MoreActionsButton = forwardRef<HTMLButtonElement, ButtonProps>(({ onClick, ...props }, ref) => (
  <Button icon="moreVert" ref={ref} onClick={onClick} {...props}>
    <Trans>More Actions</Trans>
  </Button>
))

MoreActionsButton.displayName = "MoreActionsButton"

export const Images = () => {
  const { t } = useLingui()

  const [selectedImages, setSelectedImages] = useState<Array<string>>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
  const [deactivateAllModalOpen, setDeactivateAllModalOpen] = useState(false)
  const [activateAllModalOpen, setActivateAllModalOpen] = useState(false)
  const [shouldShowSuggestedImages, setShowSuggestedImages] = useState(false)

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    filters: [
      {
        displayName: t`Status`,
        filterName: "status",
        values: Object.values(IMAGE_STATUSES),
        supportsMultiValue: true,
      },
      {
        displayName: t`Visibility`,
        filterName: "visibility",
        values: Object.values(IMAGE_VISIBILITY),
        supportsMultiValue: false,
      },
      {
        displayName: t`Disk Format`,
        filterName: "disk_format",
        values: Object.values(DISK_FORMATS),
        supportsMultiValue: true,
      },
      {
        displayName: t`Container Format`,
        filterName: "container_format",
        values: Object.values(CONTAINER_FORMATS),
        supportsMultiValue: true,
      },
      {
        displayName: t`Protected`,
        filterName: "protected",
        values: ["true", "false"],
        supportsMultiValue: false,
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

    // Group selected filters by filter name, excluding inactive ofc.
    const filterGroups = filterSettings.selectedFilters
      .filter((sf) => !sf.inactive)
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
        params[filterName] = `in:${values.join(",")}`
      } else {
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
          sort: `${sortSettings.sortBy}:${sortSettings.sortDirection}`,
          ...buildFilterParams(),
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
    placeholderData: (previousData) => previousData, // Keeps old data during refetch
    getNextPageParam: (lastPage) => {
      return lastPage.next ?? undefined
    },
    initialPageParam: undefined,
  })

  const { data: canCreate } = trpcReact.compute.canUser.useQuery("images:create")
  const { data: canDelete } = trpcReact.compute.canUser.useQuery("images:delete")
  const { data: canUpdate } = trpcReact.compute.canUser.useQuery("images:update")
  const { data: canCreateMember } = trpcReact.compute.canUser.useQuery("images:create_member")
  const { data: canDeleteMember } = trpcReact.compute.canUser.useQuery("images:delete_member")
  const { data: canUpdateMember = true } = trpcReact.compute.canUser.useQuery("images:update_member")

  // Show spinner ONLY on initial load, not on filter/sort changes - while old data is shown
  if (status === "pending" && !data) {
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
    canUpdate: canUpdate ?? false,
    canCreateMember: canCreateMember ?? false,
    canDeleteMember: canDeleteMember ?? false,
    canUpdateMember: canUpdateMember ?? false,
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
    !permissions.canUpdate ||
    images.filter((image) => selectedImages.includes(image.id)).every((image) => image.status === "deactivated")
  const isActivateAllDisabled =
    !permissions.canUpdate ||
    images.filter((image) => selectedImages.includes(image.id)).every((image) => image.status === "active")

  const handleSortChange = (newSortSettings: SortSettings) => {
    startTransition(() => {
      setSortSettings(newSortSettings)
    })
  }

  const handleFilterChange = (newFilterSettings: FilterSettings) => {
    startTransition(() => {
      setFilterSettings(newFilterSettings)
    })
  }

  const showSuggestedImages = () => {
    startTransition(() => {
      setShowSuggestedImages(true)
      setFilterSettings({
        ...filterSettings,
        selectedFilters: [
          { name: "visibility", value: IMAGE_VISIBILITY.SHARED },
          { name: "member_status", value: MEMBER_STATUSES.PENDING },
        ],
      })
    })
  }

  const showAllImages = () => {
    startTransition(() => {
      setShowSuggestedImages(false)
      setFilterSettings({
        ...filterSettings,
        selectedFilters: [],
      })
    })
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    startTransition(() => {
      setSearchTerm(searchValue)
    })
  }

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
      createModalOpen={createModalOpen}
      setCreateModalOpen={setCreateModalOpen}
      deletableImages={deletableImages}
      protectedImages={protectedImages}
      activeImages={activeImages}
      deactivatedImages={deactivatedImages}
      shouldShowSuggestedImages={shouldShowSuggestedImages}
    >
      <ListToolbar
        sortSettings={sortSettings}
        filterSettings={filterSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onFilter={handleFilterChange}
        onSearch={handleSearchChange}
        actions={
          <>
            <div className="w-full md:w-auto md:mr-auto">
              {!shouldShowSuggestedImages ? (
                <Button onClick={showSuggestedImages}>{t`Suggested Images`}</Button>
              ) : (
                <Button onClick={showAllImages}>{t`All Images`}</Button>
              )}
            </div>
            <Stack gap="2">
              {permissions.canCreate && (
                <Button onClick={() => setCreateModalOpen(true)} variant="primary">
                  Create Image
                </Button>
              )}
              {selectedImages.length === 0 ? (
                <Button icon="moreVert" disabled>
                  {t`More Actions`}
                </Button>
              ) : (
                <PopupMenu>
                  <PopupMenuToggle as={MoreActionsButton} />
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
              )}
            </Stack>
          </>
        }
      />
    </ImageListView>
  )
}
