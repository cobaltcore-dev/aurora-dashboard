import { use, Suspense, useState, startTransition, useEffect, ReactNode, useCallback } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import { GlanceImage } from "@/server/Compute/types/image"
import { useNavigate, useSearch } from "@tanstack/react-router"
import {
  Button,
  Stack,
  Spinner,
  PopupMenu,
  PopupMenuItem,
  PopupMenuToggle,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { ListToolbar } from "@/client/components/ListToolbar"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { ImageListView } from "./-components/ImageListView"
import { CONTAINER_FORMATS, DISK_FORMATS, IMAGE_STATUSES, IMAGE_VISIBILITY } from "../../-constants/filters"
import { parseFiltersFromUrl, buildFilterParams, buildUrlSearchParams } from "./urlHelpers"
import { createImagesPromise, createPermissionsPromise } from "./apiHelpers"

interface ImagesProps {
  client: TrpcClient
}

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

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: string
  sortDirection: "asc" | "desc"
}

type ImagesContentProps = {
  imagesPromise: ReturnType<typeof createImagesPromise>
  permissionsPromise: Promise<{
    canCreate: boolean
    canDelete: boolean
    canUpdate: boolean
    canCreateMember: boolean
    canDeleteMember: boolean
    canUpdateMember: boolean
  }>
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortSettings: SortSettings
  handleSortChange: (settings: SortSettings) => void
  filterSettings: FilterSettings
  handleFilterChange: (settings: FilterSettings) => void
  selectedImages: Array<string>
  setSelectedImages: (images: Array<string>) => void
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
  deleteAllModalOpen: boolean
  setDeleteAllModalOpen: (open: boolean) => void
  deactivateAllModalOpen: boolean
  setDeactivateAllModalOpen: (open: boolean) => void
  activateAllModalOpen: boolean
  setActivateAllModalOpen: (open: boolean) => void
  memberStatusView: "all" | "pending" | "accepted"
  setMemberStatusView: (view: "all" | "pending" | "accepted") => void
  isFetching: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

function ImagesContent({
  imagesPromise,
  permissionsPromise,
  searchTerm,
  setSearchTerm,
  sortSettings,
  handleSortChange,
  filterSettings,
  handleFilterChange,
  selectedImages,
  setSelectedImages,
  createModalOpen,
  setCreateModalOpen,
  deleteAllModalOpen,
  setDeleteAllModalOpen,
  deactivateAllModalOpen,
  setDeactivateAllModalOpen,
  activateAllModalOpen,
  setActivateAllModalOpen,
  memberStatusView,
  setMemberStatusView,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: ImagesContentProps) {
  const { t } = useLingui()
  const imagesData = use(imagesPromise)
  const permissions = use(permissionsPromise)

  const images = imagesData.images

  const activeFilterSettings =
    memberStatusView === "pending" || memberStatusView === "accepted"
      ? {
          ...filterSettings,
          filters: filterSettings.filters.filter((f) => f.filterName !== "visibility"),
          selectedFilters: (filterSettings.selectedFilters || []).filter((f) => f.name !== "visibility"),
        }
      : filterSettings

  // Only consider images that are in the current filtered/searched dataset
  const displayedImageIds = new Set(images.map((image: GlanceImage) => image.id))
  const validSelectedImages = selectedImages.filter((imageId) => displayedImageIds.has(imageId))

  const deletableImages = validSelectedImages.filter((imageId) => {
    const image = images.find((image: GlanceImage) => image.id === imageId)
    return image && !image.protected
  })
  const protectedImages = validSelectedImages.filter((imageId) => {
    const image = images.find((image: GlanceImage) => image.id === imageId)
    return image && image.protected
  })
  const activeImages = validSelectedImages.filter((imageId) => {
    const image = images.find((image: GlanceImage) => image.id === imageId)
    return image && image.status === IMAGE_STATUSES.ACTIVE
  })
  const deactivatedImages = validSelectedImages.filter((imageId) => {
    const image = images.find((image: GlanceImage) => image.id === imageId)
    return image && image.status === IMAGE_STATUSES.DEACTIVATED
  })

  const isDeleteAllDisabled =
    !permissions.canDelete ||
    validSelectedImages.length === 0 ||
    images
      .filter((image: GlanceImage) => validSelectedImages.includes(image.id))
      .every((image: GlanceImage) => image.protected)
  const isDeactivateAllDisabled =
    !permissions.canUpdate ||
    validSelectedImages.length === 0 ||
    images
      .filter((image: GlanceImage) => validSelectedImages.includes(image.id))
      .every((image: GlanceImage) => image.status === IMAGE_STATUSES.DEACTIVATED)
  const isActivateAllDisabled =
    !permissions.canUpdate ||
    validSelectedImages.length === 0 ||
    images
      .filter((image: GlanceImage) => validSelectedImages.includes(image.id))
      .every((image: GlanceImage) => image.status === IMAGE_STATUSES.ACTIVE)

  const memberStatusTabs = {
    items: [
      { label: t`All Images`, value: "all" },
      { label: t`Suggested Images`, value: "pending" },
      { label: t`Accepted Images`, value: "accepted" },
    ],
    activeItem: memberStatusView,
    onActiveItemChange: (value: ReactNode) => setMemberStatusView(value as "all" | "pending" | "accepted"),
  }

  return (
    <>
      <ListToolbar
        sortSettings={sortSettings}
        filterSettings={activeFilterSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onFilter={handleFilterChange}
        onSearch={setSearchTerm}
        tabs={memberStatusTabs}
        actions={
          <>
            <Stack gap="2">
              {permissions.canCreate && (
                <Button onClick={() => setCreateModalOpen(true)} variant="primary">
                  Create Image
                </Button>
              )}

              <PopupMenu>
                <PopupMenuToggle>
                  <Button icon="moreVert">
                    <Trans>More Actions</Trans>
                  </Button>
                </PopupMenuToggle>
                <PopupMenuOptions>
                  <PopupMenuItem
                    disabled={isDeleteAllDisabled}
                    label={t`Delete Selected`}
                    onClick={() => setDeleteAllModalOpen(true)}
                  />
                  <PopupMenuItem
                    disabled={isDeactivateAllDisabled}
                    label={t`Deactivate Selected`}
                    onClick={() => setDeactivateAllModalOpen(true)}
                  />
                  <PopupMenuItem
                    disabled={isActivateAllDisabled}
                    label={t`Activate Selected`}
                    onClick={() => setActivateAllModalOpen(true)}
                  />
                </PopupMenuOptions>
              </PopupMenu>
            </Stack>
          </>
        }
      />
      <ImageListView
        images={images}
        suggestedImages={memberStatusView === "pending" ? images : []}
        acceptedImages={memberStatusView === "accepted" ? images : []}
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
      />
    </>
  )
}

export const Images = ({ client }: ImagesProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as ImagesSearchParams

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [
      { label: t`Created At`, value: "created_at" },
      { label: t`Updated At`, value: "updated_at" },
      { label: t`Name`, value: "name" },
      { label: t`Size`, value: "size" },
      { label: t`Status`, value: "status" },
    ],
    sortBy: searchParams.sortBy || "created_at",
    sortDirection: searchParams.sortDirection || "desc",
  })

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
    selectedFilters: parseFiltersFromUrl(searchParams),
  })

  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const [selectedImages, setSelectedImages] = useState<Array<string>>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
  const [deactivateAllModalOpen, setDeactivateAllModalOpen] = useState(false)
  const [activateAllModalOpen, setActivateAllModalOpen] = useState(false)
  const [memberStatusView, setMemberStatusView] = useState<"all" | "pending" | "accepted">("all")
  const memberStatusFilter = memberStatusView === "all" ? undefined : memberStatusView

  const [isFetching, setIsFetching] = useState(false)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
  const [allImages, setAllImages] = useState<GlanceImage[]>([])
  const [nextMarker, setNextMarker] = useState<string | undefined>()
  const [imagesPromise, setImagesPromise] = useState(() =>
    createImagesPromise(client, sortSettings.sortBy, sortSettings.sortDirection, searchTerm, {
      ...buildFilterParams(filterSettings.selectedFilters || [], filterSettings.filters),
      member_status: memberStatusFilter,
    })
  )
  const [permissionsPromise] = useState(() => createPermissionsPromise(client))

  // Fetch next page
  const fetchNextPage = useCallback(async () => {
    if (!nextMarker || isFetchingNextPage) return

    setIsFetchingNextPage(true)
    try {
      const result = await createImagesPromise(
        client,
        sortSettings.sortBy,
        sortSettings.sortDirection,
        searchTerm,
        {
          ...buildFilterParams(
            memberStatusView === "pending" || memberStatusView === "accepted"
              ? (filterSettings.selectedFilters || []).filter((f) => f.name !== "visibility")
              : filterSettings.selectedFilters || [],
            filterSettings.filters
          ),
          member_status: memberStatusFilter,
        },
        nextMarker
      )

      setAllImages((prev) => [...prev, ...result.images])
      setNextMarker(result.next)

      // Update promise to include new images
      setImagesPromise(
        Promise.resolve({
          images: [...allImages, ...result.images],
          next: result.next,
          first: undefined,
          schema: "/v2/schemas/images",
        })
      )
    } finally {
      setIsFetchingNextPage(false)
    }
  }, [nextMarker, client, sortSettings, searchTerm, filterSettings, memberStatusView, allImages, isFetchingNextPage])

  // Sync URL params to state and refetch when URL changes (single source of truth)
  useEffect(() => {
    const urlFilters = parseFiltersFromUrl(searchParams)
    const urlSortBy = searchParams.sortBy || "created_at"
    const urlSortDirection = searchParams.sortDirection || "desc"
    const urlSearchTerm = searchParams.search || ""

    setFilterSettings((prev) => ({ ...prev, selectedFilters: urlFilters }))
    setSortSettings((prev) => ({
      ...prev,
      sortBy: urlSortBy,
      sortDirection: urlSortDirection,
    }))
    setSearchTerm(urlSearchTerm)

    // Clear selection when dataset changes
    setSelectedImages([])

    // Reset pagination state
    setAllImages([])
    setNextMarker(undefined)

    // Refetch with URL state (single fetch path)
    setIsFetching(true)
    startTransition(() => {
      const effectiveFilters =
        memberStatusView === "pending" || memberStatusView === "accepted"
          ? (urlFilters || []).filter((f) => f.name !== "visibility")
          : urlFilters || []
      const newPromise = createImagesPromise(client, urlSortBy, urlSortDirection, urlSearchTerm, {
        ...buildFilterParams(effectiveFilters, filterSettings.filters),
        member_status: memberStatusFilter,
      })
      // Mark fetching as complete once the promise resolves and update state
      newPromise.then((result) => {
        setAllImages(result.images)
        setNextMarker(result.next)
        setIsFetching(false)
      })
      setImagesPromise(newPromise)
    })
  }, [
    searchParams.status,
    searchParams.visibility,
    searchParams.disk_format,
    searchParams.container_format,
    searchParams.protected,
    searchParams.sortBy,
    searchParams.sortDirection,
    searchParams.search,
    memberStatusView,
  ])

  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options,
      sortBy: newSortSettings.sortBy?.toString() || "created_at",
      sortDirection: newSortSettings.sortDirection || "desc",
    }

    setSortSettings(settings)
    navigate({
      search: ((prev: ImagesSearchParams) => ({
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
      search: ((prev: ImagesSearchParams) =>
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
      search: ((prev: ImagesSearchParams) => ({
        ...prev,
        search: searchValue || undefined,
      })) as unknown as true,
      replace: true,
    })
  }

  const handleMemberStatusChange = (view: "all" | "pending" | "accepted") => {
    setMemberStatusView(view)
  }

  return (
    <div className="relative">
      <Suspense
        fallback={
          <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
            <Spinner variant="primary" size="large" className="mb-2" />
            <Trans>Loading Images...</Trans>
          </Stack>
        }
      >
        <ImagesContent
          imagesPromise={imagesPromise}
          permissionsPromise={permissionsPromise}
          searchTerm={searchTerm}
          setSearchTerm={handleSearchChange}
          sortSettings={sortSettings}
          handleSortChange={handleSortChange}
          filterSettings={filterSettings}
          handleFilterChange={handleFilterChange}
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          createModalOpen={createModalOpen}
          setCreateModalOpen={setCreateModalOpen}
          deleteAllModalOpen={deleteAllModalOpen}
          setDeleteAllModalOpen={setDeleteAllModalOpen}
          deactivateAllModalOpen={deactivateAllModalOpen}
          setDeactivateAllModalOpen={setDeactivateAllModalOpen}
          activateAllModalOpen={activateAllModalOpen}
          setActivateAllModalOpen={setActivateAllModalOpen}
          memberStatusView={memberStatusView}
          setMemberStatusView={handleMemberStatusChange}
          isFetching={isFetching}
          hasNextPage={!!nextMarker}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </Suspense>
    </div>
  )
}
