import { forwardRef, useState, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { trpcReact } from "@/client/trpcClient"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate, useSearch } from "@tanstack/react-router"
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
import { FilterSettings, SortSettings, SelectedFilter } from "@/client/components/ListToolbar/types"
import { ImageListView } from "./-components/ImageListView"
import {
  CONTAINER_FORMATS,
  DISK_FORMATS,
  IMAGE_STATUSES,
  IMAGE_VISIBILITY,
  MEMBER_STATUSES,
} from "../../-constants/filters"
import { GlanceImage } from "@/server/Compute/types/image"

type ImagesSearchParams = {
  status?: string
  visibility?: string
  disk_format?: string
  container_format?: string
  protected?: string
  search?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
}

// Define the custom toggle button component outside
const MoreActionsButton = forwardRef<HTMLButtonElement, ButtonProps>(({ onClick, ...props }, ref) => (
  <Button icon="moreVert" ref={ref} onClick={onClick} {...props}>
    <Trans>More Actions</Trans>
  </Button>
))

MoreActionsButton.displayName = "MoreActionsButton"

export const Images = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as ImagesSearchParams

  const [selectedImages, setSelectedImages] = useState<Array<string>>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
  const [deactivateAllModalOpen, setDeactivateAllModalOpen] = useState(false)
  const [activateAllModalOpen, setActivateAllModalOpen] = useState(false)
  const [shouldShowSuggestedImages, setShowSuggestedImages] = useState(false)
  const [shouldShowAcceptedImages, setShowAcceptedImages] = useState(false)

  // Parse URL search params into selectedFilters array
  const selectedFilters = useMemo((): SelectedFilter[] => {
    const filters: SelectedFilter[] = []

    // Status filter
    if (searchParams.status) {
      const values = searchParams.status.startsWith("in:")
        ? searchParams.status.replace("in:", "").split(",")
        : [searchParams.status]
      values.forEach((value: string) => {
        filters.push({ name: "status", value })
      })
    }

    // Visibility filter
    if (searchParams.visibility) {
      filters.push({ name: "visibility", value: searchParams.visibility })
    }

    // Disk format filter
    if (searchParams.disk_format) {
      const values = searchParams.disk_format.startsWith("in:")
        ? searchParams.disk_format.replace("in:", "").split(",")
        : [searchParams.disk_format]
      values.forEach((value: string) => {
        filters.push({ name: "disk_format", value })
      })
    }

    // Container format filter
    if (searchParams.container_format) {
      const values = searchParams.container_format.startsWith("in:")
        ? searchParams.container_format.replace("in:", "").split(",")
        : [searchParams.container_format]
      values.forEach((value: string) => {
        filters.push({ name: "container_format", value })
      })
    }

    // Protected filter
    if (searchParams.protected) {
      filters.push({ name: "protected", value: searchParams.protected })
    }

    return filters
  }, [searchParams])

  const filterSettings = useMemo(
    (): FilterSettings => ({
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
      selectedFilters,
    }),
    [t, selectedFilters]
  )

  const searchTerm = searchParams.search || ""

  const sortSettings = useMemo(
    (): SortSettings => ({
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
      sortBy: searchParams.sortBy || "created_at",
      sortDirection: searchParams.sortDirection || "desc",
    }),
    [t, searchParams.sortBy, searchParams.sortDirection]
  )

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

  const sharedQueryInput = {
    sort: `${sortSettings.sortBy}:${sortSettings.sortDirection}`,
    ...buildFilterParams(),
  }

  /**
   * When a search term is active, use listImagesWithSearch (flat, no pagination) so that
   * server-side name filtering works correctly across the full result set.
   * When no search term, use listImagesWithPagination with infinite scroll.
   */
  const {
    data: searchData,
    isFetching: isSearchFetching,
    isPending: isSearchPending,
    isError: isSearchError,
    error: searchError,
  } = trpcReact.compute.listImagesWithSearch.useQuery(
    { ...sharedQueryInput, name: searchTerm },
    { enabled: !!searchTerm }
  )

  const fetchPaginatedImages = async ({ pageParam }: { pageParam?: string }) => {
    const params = pageParam ? { next: pageParam } : { limit: 15, ...sharedQueryInput }

    return await utils.client.compute.listImagesWithPagination.query(params)
  }

  const {
    data: paginatedData,
    error: paginatedError,
    fetchNextPage,
    hasNextPage,
    isFetching: isPaginatedFetching,
    isFetchingNextPage,
    isPending: isPaginatedPending,
    isError: isPaginatedError,
  } = useInfiniteQuery({
    /**
     * Query key includes sort and filter settings to trigger refetch when they change.
     * Search term is intentionally excluded — searching uses the listImages query above.
     */
    queryKey: [
      ["compute", "listImagesWithPagination"],
      {
        input: {
          limit: 15,
          sort: `${sortSettings.sortBy}:${sortSettings.sortDirection}`,
          filters: buildFilterParams(),
        },
        type: "query",
      },
    ],
    queryFn: fetchPaginatedImages,
    placeholderData: (previousData) => previousData,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: !searchTerm,
  })

  const data = searchTerm ? null : paginatedData
  const error = searchTerm ? searchError : paginatedError
  const isFetching = searchTerm ? isSearchFetching : isPaginatedFetching
  const isPending = searchTerm ? isSearchPending : isPaginatedPending
  const isError = searchTerm ? isSearchError : isPaginatedError

  const { data: suggestedImages, isLoading: suggestedImagesLoading } =
    trpcReact.compute.listSharedImagesByMemberStatus.useQuery({
      memberStatus: MEMBER_STATUSES.PENDING,
    })

  const { data: acceptedImages, isLoading: acceptedImagesLoading } =
    trpcReact.compute.listSharedImagesByMemberStatus.useQuery({
      memberStatus: MEMBER_STATUSES.ACCEPTED,
    })

  const suggestedImagesCount = suggestedImages?.length || 0
  const acceptedImagesCount = acceptedImages?.length || 0

  const { data: canCreate } = trpcReact.compute.canUser.useQuery("images:create")
  const { data: canDelete } = trpcReact.compute.canUser.useQuery("images:delete")
  const { data: canUpdate } = trpcReact.compute.canUser.useQuery("images:update")
  const { data: canCreateMember } = trpcReact.compute.canUser.useQuery("images:create_member")
  const { data: canDeleteMember } = trpcReact.compute.canUser.useQuery("images:delete_member")
  const { data: canUpdateMember = true } = trpcReact.compute.canUser.useQuery("images:update_member")

  if (isPending && !data) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Images...</Trans>
      </Stack>
    )
  }

  if (isError) {
    const errorMessage = error?.message

    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Trans>Error Loading Images: {errorMessage}</Trans>
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

  // In search mode, use the flat listImages result; otherwise flatten paginated pages
  const images = searchTerm ? (searchData ?? []) : (data?.pages.flatMap((page) => page.images) ?? [])

  const deletableImages = selectedImages.filter(
    (imageId) => !images.find((image: GlanceImage) => image.id === imageId)?.protected
  )
  const protectedImages = selectedImages.filter(
    (imageId) => images.find((image: GlanceImage) => image.id === imageId)?.protected
  )
  const activeImages = selectedImages.filter(
    (imageId) => images.find((image: GlanceImage) => image.id === imageId)?.status === IMAGE_STATUSES.ACTIVE
  )
  const deactivatedImages = selectedImages.filter(
    (imageId) => images.find((image: GlanceImage) => image.id === imageId)?.status === IMAGE_STATUSES.DEACTIVATED
  )

  const isDeleteAllDisabled =
    !permissions.canDelete ||
    images
      .filter((image: GlanceImage) => selectedImages.includes(image.id))
      .every((image: GlanceImage) => image.protected)
  const isDeactivateAllDisabled =
    !permissions.canUpdate ||
    images
      .filter((image: GlanceImage) => selectedImages.includes(image.id))
      .every((image: GlanceImage) => image.status === IMAGE_STATUSES.DEACTIVATED)
  const isActivateAllDisabled =
    !permissions.canUpdate ||
    images
      .filter((image: GlanceImage) => selectedImages.includes(image.id))
      .every((image: GlanceImage) => image.status === IMAGE_STATUSES.ACTIVE)

  const handleSortChange = (newSortSettings: SortSettings) => {
    const sortBy = typeof newSortSettings.sortBy === "string" ? newSortSettings.sortBy : undefined
    navigate({
      search: {
        ...searchParams,
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        sortBy,
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        sortDirection: newSortSettings.sortDirection,
      },
      replace: true,
    })
  }

  const handleFilterChange = (newFilterSettings: FilterSettings) => {
    const newSearchParams: Partial<Record<string, unknown>> = {
      // Keep existing non-filter params
      search: searchParams.search,
      sortBy: searchParams.sortBy,
      sortDirection: searchParams.sortDirection,
    }

    // Build filter params from selectedFilters
    if (newFilterSettings.selectedFilters?.length) {
      const filterGroups = newFilterSettings.selectedFilters
        .filter((sf) => !sf.inactive)
        .reduce(
          (acc, sf) => {
            if (!acc[sf.name]) acc[sf.name] = []
            acc[sf.name].push(sf.value)
            return acc
          },
          {} as Record<string, string[]>
        )

      Object.entries(filterGroups).forEach(([filterName, values]) => {
        const filterDef = newFilterSettings.filters.find((f) => f.filterName === filterName)

        if (filterDef?.supportsMultiValue && values.length > 1) {
          newSearchParams[filterName] = `in:${values.join(",")}`
        } else {
          newSearchParams[filterName] = values[0]
        }
      })
    }

    navigate({
      // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
      search: newSearchParams,
      replace: true,
    })
  }

  const showSuggestedImages = () => {
    setShowSuggestedImages(true)
    setShowAcceptedImages(false)
    // Clear all filters from URL
    navigate({
      search: {
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        search: searchParams.search,
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        sortBy: searchParams.sortBy,
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        sortDirection: searchParams.sortDirection,
      },
      replace: true,
    })
  }

  const showAcceptedImages = () => {
    setShowSuggestedImages(false)
    setShowAcceptedImages(true)
    // Clear all filters from URL
    navigate({
      search: {
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        search: searchParams.search,
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        sortBy: searchParams.sortBy,
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        sortDirection: searchParams.sortDirection,
      },
      replace: true,
    })
  }

  const showAllImages = () => {
    setShowSuggestedImages(false)
    setShowAcceptedImages(false)
    // Clear all filters from URL
    navigate({
      search: {
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        search: searchParams.search,
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        sortBy: searchParams.sortBy,
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        sortDirection: searchParams.sortDirection,
      },
      replace: true,
    })
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    navigate({
      search: {
        ...searchParams,
        // @ts-ignore - TanStack Router doesn't infer search params correctly from splat routes
        search: searchValue || undefined,
      },
      replace: true,
    })
  }

  const getImages = () => {
    if (shouldShowSuggestedImages) {
      return suggestedImages ?? []
    }

    if (shouldShowAcceptedImages) {
      return acceptedImages ?? []
    }

    return images
  }

  return (
    <>
      <ListToolbar
        sortSettings={sortSettings}
        filterSettings={filterSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onFilter={handleFilterChange}
        onSearch={handleSearchChange}
        actions={
          <>
            <div className="w-full md:mr-auto md:w-auto">
              {(shouldShowSuggestedImages || shouldShowAcceptedImages) && (
                <Button onClick={showAllImages}>{t`All Images`}</Button>
              )}
            </div>
            <Stack gap="2">
              {permissions.canCreate && (
                <Button onClick={() => setCreateModalOpen(true)} variant="primary">
                  Create Image
                </Button>
              )}

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
                  <PopupMenuItem
                    disabled={!suggestedImagesCount || suggestedImagesLoading}
                    label={t`Show Suggested Images (${suggestedImagesCount})`}
                    onClick={showSuggestedImages}
                  />
                  <PopupMenuItem
                    disabled={!acceptedImagesCount || acceptedImagesLoading}
                    label={t`Show Accepted Images (${acceptedImagesCount})`}
                    onClick={showAcceptedImages}
                  />
                </PopupMenuOptions>
              </PopupMenu>
            </Stack>
          </>
        }
      />
      <ImageListView
        images={getImages()}
        suggestedImages={suggestedImages ?? []}
        acceptedImages={acceptedImages ?? []}
        permissions={permissions}
        hasNextPage={searchTerm ? false : hasNextPage}
        isFetchingNextPage={searchTerm ? false : isFetchingNextPage}
        fetchNextPage={searchTerm ? async () => {} : fetchNextPage}
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
      />
    </>
  )
}
