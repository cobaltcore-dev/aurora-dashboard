import { use, Suspense, useState, startTransition, useEffect } from "react"
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
import {
  createImagesPromise,
  createPermissionsPromise,
  createSuggestedImagesPromise,
  createAcceptedImagesPromise,
} from "./apiHelpers"

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

function ImagesContent({
  imagesPromise,
  permissionsPromise,
  suggestedImagesPromise,
  acceptedImagesPromise,
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
  shouldShowSuggestedImages,
  shouldShowAcceptedImages,
  showSuggestedImages,
  showAcceptedImages,
  showAllImages,
}: {
  imagesPromise: Promise<GlanceImage[]>
  permissionsPromise: Promise<{
    canCreate: boolean
    canDelete: boolean
    canUpdate: boolean
    canCreateMember: boolean
    canDeleteMember: boolean
    canUpdateMember: boolean
  }>
  suggestedImagesPromise: Promise<GlanceImage[]>
  acceptedImagesPromise: Promise<GlanceImage[]>
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
  shouldShowSuggestedImages: boolean
  shouldShowAcceptedImages: boolean
  showSuggestedImages: () => void
  showAcceptedImages: () => void
  showAllImages: () => void
}) {
  const { t } = useLingui()
  const images = use(imagesPromise)
  const permissions = use(permissionsPromise)
  const suggestedImages = use(suggestedImagesPromise)
  const acceptedImages = use(acceptedImagesPromise)

  const suggestedImagesCount = suggestedImages?.length || 0
  const acceptedImagesCount = acceptedImages?.length || 0

  const displayedImages = shouldShowSuggestedImages
    ? suggestedImages
    : shouldShowAcceptedImages
      ? acceptedImages
      : images

  const deletableImages = selectedImages.filter(
    (imageId) => !displayedImages.find((image: GlanceImage) => image.id === imageId)?.protected
  )
  const protectedImages = selectedImages.filter(
    (imageId) => displayedImages.find((image: GlanceImage) => image.id === imageId)?.protected
  )
  const activeImages = selectedImages.filter(
    (imageId) => displayedImages.find((image: GlanceImage) => image.id === imageId)?.status === IMAGE_STATUSES.ACTIVE
  )
  const deactivatedImages = selectedImages.filter(
    (imageId) =>
      displayedImages.find((image: GlanceImage) => image.id === imageId)?.status === IMAGE_STATUSES.DEACTIVATED
  )

  const isDeleteAllDisabled =
    !permissions.canDelete ||
    displayedImages
      .filter((image: GlanceImage) => selectedImages.includes(image.id))
      .every((image: GlanceImage) => image.protected)
  const isDeactivateAllDisabled =
    !permissions.canUpdate ||
    displayedImages
      .filter((image: GlanceImage) => selectedImages.includes(image.id))
      .every((image: GlanceImage) => image.status === IMAGE_STATUSES.DEACTIVATED)
  const isActivateAllDisabled =
    !permissions.canUpdate ||
    displayedImages
      .filter((image: GlanceImage) => selectedImages.includes(image.id))
      .every((image: GlanceImage) => image.status === IMAGE_STATUSES.ACTIVE)

  return (
    <>
      <ListToolbar
        sortSettings={sortSettings}
        filterSettings={filterSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onFilter={handleFilterChange}
        onSearch={setSearchTerm}
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
                <PopupMenuToggle>
                  <Button icon="moreVert">
                    <Trans>More Actions</Trans>
                  </Button>
                </PopupMenuToggle>
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
                    disabled={!suggestedImagesCount}
                    label={t`Show Suggested Images (${suggestedImagesCount})`}
                    onClick={showSuggestedImages}
                  />
                  <PopupMenuItem
                    disabled={!acceptedImagesCount}
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
        images={displayedImages}
        suggestedImages={suggestedImages}
        acceptedImages={acceptedImages}
        permissions={permissions}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={async () => {}}
        isFetching={false}
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
  const [shouldShowSuggestedImages, setShowSuggestedImages] = useState(false)
  const [shouldShowAcceptedImages, setShowAcceptedImages] = useState(false)

  const [imagesPromise, setImagesPromise] = useState(() =>
    createImagesPromise(
      client,
      sortSettings.sortBy,
      sortSettings.sortDirection,
      searchTerm,
      buildFilterParams(filterSettings.selectedFilters || [], filterSettings.filters)
    )
  )
  const [permissionsPromise] = useState(() => createPermissionsPromise(client))
  const [suggestedImagesPromise] = useState(() => createSuggestedImagesPromise(client))
  const [acceptedImagesPromise] = useState(() => createAcceptedImagesPromise(client))

  // Sync URL params to state when URL changes (for back/forward navigation)
  useEffect(() => {
    const urlFilters = parseFiltersFromUrl(searchParams)
    setFilterSettings((prev) => ({ ...prev, selectedFilters: urlFilters }))
    setSortSettings((prev) => ({
      ...prev,
      sortBy: searchParams.sortBy || "created_at",
      sortDirection: searchParams.sortDirection || "desc",
    }))
    setSearchTerm(searchParams.search || "")

    // Refetch with new URL params
    startTransition(() => {
      setImagesPromise(
        createImagesPromise(
          client,
          searchParams.sortBy || "created_at",
          searchParams.sortDirection || "desc",
          searchParams.search || "",
          buildFilterParams(urlFilters, filterSettings.filters)
        )
      )
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
  ])

  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options,
      sortBy: newSortSettings.sortBy?.toString() || "created_at",
      sortDirection: newSortSettings.sortDirection || "desc",
    }

    setSortSettings(settings)
    // Type assertion needed because TanStack Router doesn't infer search params correctly for splat routes
    navigate({
      search: ((prev: ImagesSearchParams) => ({
        ...prev,
        sortBy: settings.sortBy,
        sortDirection: settings.sortDirection,
      })) as unknown as true,
      replace: true,
    })

    startTransition(() => {
      setImagesPromise(
        createImagesPromise(
          client,
          settings.sortBy,
          settings.sortDirection,
          searchTerm,
          buildFilterParams(filterSettings.selectedFilters || [], filterSettings.filters)
        )
      )
    })
  }

  const handleFilterChange = (newFilterSettings: FilterSettings) => {
    setFilterSettings(newFilterSettings)

    // Type assertion needed because TanStack Router doesn't infer search params correctly for splat routes
    navigate({
      search: ((prev: ImagesSearchParams) =>
        buildUrlSearchParams(newFilterSettings.selectedFilters || [], newFilterSettings.filters, {
          search: prev.search,
          sortBy: prev.sortBy,
          sortDirection: prev.sortDirection,
        })) as unknown as true,
      replace: true,
    })

    startTransition(() => {
      setImagesPromise(
        createImagesPromise(
          client,
          sortSettings.sortBy,
          sortSettings.sortDirection,
          searchTerm,
          buildFilterParams(newFilterSettings.selectedFilters || [], newFilterSettings.filters)
        )
      )
    })
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    setSearchTerm(searchValue)

    // Type assertion needed because TanStack Router doesn't infer search params correctly for splat routes
    navigate({
      search: ((prev: ImagesSearchParams) => ({
        ...prev,
        search: searchValue || undefined,
      })) as unknown as true,
      replace: true,
    })

    startTransition(() => {
      setImagesPromise(
        createImagesPromise(
          client,
          sortSettings.sortBy,
          sortSettings.sortDirection,
          searchValue,
          buildFilterParams(filterSettings.selectedFilters || [], filterSettings.filters)
        )
      )
    })
  }

  const showSuggestedImages = () => {
    setShowSuggestedImages(true)
    setShowAcceptedImages(false)
  }

  const showAcceptedImages = () => {
    setShowSuggestedImages(false)
    setShowAcceptedImages(true)
  }

  const showAllImages = () => {
    setShowSuggestedImages(false)
    setShowAcceptedImages(false)
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
          suggestedImagesPromise={suggestedImagesPromise}
          acceptedImagesPromise={acceptedImagesPromise}
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
          shouldShowSuggestedImages={shouldShowSuggestedImages}
          shouldShowAcceptedImages={shouldShowAcceptedImages}
          showSuggestedImages={showSuggestedImages}
          showAcceptedImages={showAcceptedImages}
          showAllImages={showAllImages}
        />
      </Suspense>
    </div>
  )
}
