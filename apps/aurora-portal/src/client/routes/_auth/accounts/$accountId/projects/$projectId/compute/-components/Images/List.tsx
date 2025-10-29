import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { trpcReact } from "@/client/trpcClient"
import { Trans, useLingui } from "@lingui/react/macro"
import { Spinner, Stack } from "@cloudoperators/juno-ui-components/index"
import { ListToolbar } from "@/client/components/ListToolbar"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { ImageListView } from "./-components/ImageListView"
import { CONTAINER_FORMATS, DISK_FORMATS, IMAGE_STATUSES, IMAGE_VISIBILITY } from "../../-constants/filters"

export const Images = () => {
  const { t } = useLingui()

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
   * Fetches images with pagination and sorting
   *
   * OpenStack Glance API supports two sorting syntaxes:
   *
   * 1. New syntax (recommended): sort=field:direction
   *    Example: sort=name:asc or sort=created_at:desc
   *
   * 2. Classic syntax: sort_key=field&sort_dir=direction
   *    Example: sort_key=name&sort_dir=asc
   *
   * This implementation uses the new syntax for cleaner URLs
   */
  const fetchImages = async ({ pageParam }: { pageParam?: string }) => {
    // If pageParam exists, only pass 'next' (it already contains limit and other params)
    // Otherwise, pass the initial query params with limit and sort parameters
    const params = pageParam
      ? { next: pageParam }
      : {
          limit: 15,
          // New syntax (recommended): sort=field:direction
          sort: `${sortSettings.sortBy}:${sortSettings.sortDirection}`,

          // Alternative: Classic syntax (uncomment to use)
          // sort_key: sortSettings.sortBy,
          // sort_dir: sortSettings.sortDirection,
        }

    return await utils.client.compute.listImagesWithPagination.query(params)
  }

  const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, status } = useInfiniteQuery({
    /**
     * Query key includes sort settings to trigger refetch when sorting changes
     * This ensures the data is re-fetched whenever the user changes sort field or direction
     */
    queryKey: [
      ["compute", "listImagesWithPagination"],
      {
        input: {
          limit: 15,
          sort: `${sortSettings.sortBy}:${sortSettings.sortDirection}`,
          // Note: searchTerm and filterSettings could also be added here
          // to refetch when those change as well
        },
        type: "query",
      },
    ],
    queryFn: fetchImages,
    getNextPageParam: (lastPage) => {
      // Return the full next URL from the API response
      // The next URL should already include the sort parameters from the initial request
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

  return (
    <>
      <ImageListView
        images={images}
        permissions={permissions}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isFetching={isFetching}
      >
        {images.length ? (
          <ListToolbar
            sortSettings={sortSettings}
            filterSettings={filterSettings}
            searchTerm={searchTerm}
            onSort={setSortSettings}
            onFilter={setFilterSettings}
            onSearch={setSearchTerm}
            filtersInputProps={{ selectInputProps: { className: "w-48" } }}
            sortInputProps={{ inputGroupProps: { className: "md:w-48" } }}
          />
        ) : null}
      </ImageListView>
    </>
  )
}
