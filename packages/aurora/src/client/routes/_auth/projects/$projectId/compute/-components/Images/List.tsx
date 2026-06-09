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
  DataGridToolbar,
  SearchInput,
  Checkbox,
  TabNavigation,
  TabNavigationItem,
} from "@cloudoperators/juno-ui-components"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { ImageListView } from "./-components/ImageListView"
import { CONTAINER_FORMATS, DISK_FORMATS, IMAGE_STATUSES, IMAGE_VISIBILITY } from "../../-constants/filters"
import { parseFiltersFromUrl, buildFilterParams, buildUrlSearchParams, applyFilterSelection } from "./urlHelpers"
import { createImagesPromise, createPermissionsPromise } from "./apiHelpers"

const PAGE_SIZE = 50

interface ImagesProps {
  client: TrpcClient
  project: string
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
  memberStatus?: "all" | "accepted" | "pending"
  page?: number
}

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: string
  sortDirection: "asc" | "desc"
}

type ImagesResult = {
  images: GlanceImage[]
  first?: string
  next?: string
  schema: string
  listError?: string
}

type ImagesContentProps = {
  imagesPromise: Promise<ImagesResult>
  imageOverrides: Map<string, GlanceImage>
  deletedImageIds: Set<string>
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
  currentPage: number
  onPageChange: (page: number) => void
  onImageUpdated: (image: GlanceImage) => void
  onImageDeleted: (imageIds: string | string[]) => void
  onMemberStatusChanged: () => void
}

function ImagesContent({
  imagesPromise,
  imageOverrides,
  deletedImageIds,
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
  currentPage,
  onPageChange,
  onImageUpdated,
  onImageDeleted,
  onMemberStatusChanged,
}: ImagesContentProps) {
  const { t } = useLingui()
  const imagesData = use(imagesPromise)
  const permissions = use(permissionsPromise)

  if (imagesData.listError) {
    return <p>{imagesData.listError}</p>
  }

  const images = imagesData.images
    .filter((img) => !deletedImageIds.has(img.id))
    .map((img) => imageOverrides.get(img.id) ?? img)

  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedImages = images.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    if (currentPage !== 1 && currentPage > totalPages) onPageChange(1)
  }, [totalPages, currentPage, onPageChange])

  const activeFilterSettings =
    memberStatusView === "pending" || memberStatusView === "accepted"
      ? {
          ...filterSettings,
          filters: filterSettings.filters.filter((f) => f.filterName !== "visibility"),
          selectedFilters: (filterSettings.selectedFilters || []).filter((f) => f.name !== "visibility"),
        }
      : filterSettings

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
      { label: t`Accepted Images`, value: "accepted" },
      { label: t`Suggested Images`, value: "pending" },
    ],
    activeItem: memberStatusView,
    onActiveItemChange: (value: ReactNode) => setMemberStatusView(value as "all" | "pending" | "accepted"),
  }

  return (
    <>
      {/* Tab navigation for member status */}
      <div className="w-full">
        <TabNavigation activeItem={memberStatusView} onActiveItemChange={memberStatusTabs.onActiveItemChange}>
          {memberStatusTabs.items.map((item) => (
            <TabNavigationItem key={item.value} label={item.label} value={item.value} />
          ))}
        </TabNavigation>
      </div>

      {/* Zone 1 — sort + create / more actions, no background */}
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        <Stack gap="0.5">
          <SortInput
            options={sortSettings.options}
            sortBy={sortSettings.sortBy}
            sortDirection={sortSettings.sortDirection ?? "desc"}
            onSortByChange={(v) =>
              handleSortChange({ ...sortSettings, sortBy: v, sortDirection: sortSettings.sortDirection })
            }
            onSortDirectionChange={(dir) => handleSortChange({ ...sortSettings, sortDirection: dir })}
          />
        </Stack>
        <Stack gap="0.5">
          {permissions.canCreate && (
            <Button onClick={() => setCreateModalOpen(true)} variant="primary">
              <Trans>Create Image</Trans>
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Zone 2 — filter + search + active filter pills */}
      <DataGridToolbar>
        <Stack direction="vertical" gap="2">
          <Stack distribution="between" alignment="center">
            <FiltersInput
              filters={activeFilterSettings.filters}
              onChange={(selected) => {
                const newSelected = applyFilterSelection(
                  activeFilterSettings.selectedFilters || [],
                  selected,
                  activeFilterSettings.filters
                )
                if (newSelected === (activeFilterSettings.selectedFilters || [])) return
                handleFilterChange({ ...filterSettings, selectedFilters: newSelected })
              }}
            />
            <SearchInput
              placeholder={t`Search images…`}
              data-testid="searchbar"
              value={searchTerm}
              onInput={(e: React.FormEvent<HTMLInputElement>) => setSearchTerm(e.currentTarget.value)}
              onSearch={(v) => setSearchTerm(typeof v === "string" ? v : "")}
              onClear={() => setSearchTerm("")}
            />
          </Stack>
          {activeFilterSettings.selectedFilters && activeFilterSettings.selectedFilters.length > 0 && (
            <SelectedFilters
              selectedFilters={activeFilterSettings.selectedFilters}
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

      {/* Zone 3 — select all + bulk actions (only when at least one bulk action is available) */}
      {(permissions.canDelete || permissions.canUpdate) && (
        <DataGridToolbar>
          <Stack distribution="between" alignment="center">
            <Stack gap="2" alignment="center">
              <Checkbox
                checked={
                  validSelectedImages.length > 0 && paginatedImages.every((img) => validSelectedImages.includes(img.id))
                }
                indeterminate={
                  validSelectedImages.length > 0 &&
                  !paginatedImages.every((img) => validSelectedImages.includes(img.id))
                }
                onChange={() => {
                  const pageIds = paginatedImages.map((img) => img.id)
                  const allSelected = pageIds.every((id) => validSelectedImages.includes(id))
                  if (allSelected) {
                    setSelectedImages(validSelectedImages.filter((id) => !pageIds.includes(id)))
                  } else {
                    setSelectedImages([...new Set([...validSelectedImages, ...pageIds])])
                  }
                }}
              />
              <PopupMenu>
                <PopupMenuToggle as="div">
                  <Button size="xs" icon="moreVert" label={t`Actions`} />
                </PopupMenuToggle>
                <PopupMenuOptions>
                  {permissions.canDelete && (
                    <PopupMenuItem
                      disabled={isDeleteAllDisabled}
                      label={t`Delete Selected`}
                      onClick={() => setDeleteAllModalOpen(true)}
                    />
                  )}
                  {permissions.canUpdate && (
                    <PopupMenuItem
                      disabled={isDeactivateAllDisabled}
                      label={t`Deactivate Selected`}
                      onClick={() => setDeactivateAllModalOpen(true)}
                    />
                  )}
                  {permissions.canUpdate && (
                    <PopupMenuItem
                      disabled={isActivateAllDisabled}
                      label={t`Activate Selected`}
                      onClick={() => setActivateAllModalOpen(true)}
                    />
                  )}
                </PopupMenuOptions>
              </PopupMenu>
            </Stack>
          </Stack>
        </DataGridToolbar>
      )}
      <ImageListView
        images={paginatedImages}
        suggestedImages={memberStatusView === "pending" ? paginatedImages : []}
        acceptedImages={memberStatusView === "accepted" ? paginatedImages : []}
        permissions={permissions}
        isFetching={isFetching}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={onPageChange}
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
        onImageUpdated={onImageUpdated}
        onImageDeleted={onImageDeleted}
        onMemberStatusChanged={onMemberStatusChanged}
        hasAnyBulkAction={permissions.canDelete || permissions.canUpdate}
      />
    </>
  )
}

export const Images = ({ client, project }: ImagesProps) => {
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
  const currentPage = searchParams.page ?? 1
  const [selectedImages, setSelectedImages] = useState<Array<string>>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
  const [deactivateAllModalOpen, setDeactivateAllModalOpen] = useState(false)
  const [activateAllModalOpen, setActivateAllModalOpen] = useState(false)
  const memberStatusView = searchParams.memberStatus ?? "all"

  const [isFetching, setIsFetching] = useState(true)
  const [imageOverrides, setImageOverrides] = useState<Map<string, GlanceImage>>(new Map())
  const [deletedImageIds, setDeletedImageIds] = useState<Set<string>>(new Set())
  const [imagesPromise, setImagesPromise] = useState<Promise<ImagesResult>>(
    () =>
      new Promise(() => {
        // Placeholder: replaced immediately by useEffect on mount
      }) as Promise<ImagesResult>
  )
  const [permissionsPromise] = useState(() => createPermissionsPromise(client, project))

  const handleImageUpdated = useCallback((updatedImage: GlanceImage) => {
    setImageOverrides((prev) => new Map(prev).set(updatedImage.id, updatedImage))
  }, [])

  const handleImageDeleted = useCallback((imageIds: string | string[]) => {
    setDeletedImageIds((prev) => {
      const next = new Set(prev)
      if (Array.isArray(imageIds)) imageIds.forEach((id) => next.add(id))
      else next.add(imageIds)
      return next
    })
  }, [])

  const handleMemberStatusChanged = useCallback(() => {
    setImageOverrides(new Map())
    setIsFetching(true)
    const urlMemberStatus = searchParams.memberStatus ?? "all"
    const urlMemberStatusFilter = urlMemberStatus === "all" ? undefined : urlMemberStatus
    startTransition(() => {
      const effectiveFilters =
        urlMemberStatus === "pending" || urlMemberStatus === "accepted"
          ? (filterSettings.selectedFilters || []).filter((f) => f.name !== "visibility")
          : filterSettings.selectedFilters || []
      const newPromise = createImagesPromise(
        client,
        project,
        sortSettings.sortBy,
        sortSettings.sortDirection,
        searchTerm,
        {
          ...buildFilterParams(effectiveFilters, filterSettings.filters),
          member_status: urlMemberStatusFilter,
        }
      )
      newPromise.catch(() => {}).finally(() => setIsFetching(false))
      setImagesPromise(newPromise as Promise<ImagesResult>)
    })
  }, [client, sortSettings, searchTerm, filterSettings, searchParams.memberStatus])

  useEffect(() => {
    const urlFilters = parseFiltersFromUrl(searchParams)
    const urlSortBy = searchParams.sortBy || "created_at"
    const urlSortDirection = searchParams.sortDirection || "desc"
    const urlSearchTerm = searchParams.search || ""

    setFilterSettings((prev) => ({ ...prev, selectedFilters: urlFilters }))
    setSortSettings((prev) => ({ ...prev, sortBy: urlSortBy, sortDirection: urlSortDirection }))
    setSearchTerm(urlSearchTerm)
    setSelectedImages([])
    setImageOverrides(new Map())

    setIsFetching(true)
    const urlMemberStatus = searchParams.memberStatus ?? "all"
    const urlMemberStatusFilter = urlMemberStatus === "all" ? undefined : urlMemberStatus
    startTransition(() => {
      const effectiveFilters =
        urlMemberStatus === "pending" || urlMemberStatus === "accepted"
          ? (urlFilters || []).filter((f) => f.name !== "visibility")
          : urlFilters || []
      const newPromise = createImagesPromise(client, project, urlSortBy, urlSortDirection, urlSearchTerm, {
        ...buildFilterParams(effectiveFilters, filterSettings.filters),
        member_status: urlMemberStatusFilter,
      })
      newPromise.catch(() => {}).finally(() => setIsFetching(false))
      setImagesPromise(newPromise as Promise<ImagesResult>)
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
    searchParams.memberStatus,
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
        page: undefined,
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
          memberStatus: prev.memberStatus,
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
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
  }

  const handleMemberStatusChange = (view: "all" | "pending" | "accepted") => {
    navigate({
      search: ((prev: ImagesSearchParams) => ({
        sortBy: prev.sortBy,
        sortDirection: prev.sortDirection,
        search: prev.search,
        memberStatus: view === "all" ? undefined : view,
      })) as unknown as true,
    })
  }

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({
        search: ((prev: ImagesSearchParams) => ({
          ...prev,
          page: page === 1 ? undefined : page,
        })) as unknown as true,
      })
    },
    [navigate]
  )

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
          imageOverrides={imageOverrides}
          deletedImageIds={deletedImageIds}
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
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onImageUpdated={handleImageUpdated}
          onImageDeleted={handleImageDeleted}
          onMemberStatusChanged={handleMemberStatusChanged}
        />
      </Suspense>
    </div>
  )
}
