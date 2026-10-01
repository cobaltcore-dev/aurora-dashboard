import { use, Suspense, useState, useRef, startTransition, useEffect, useCallback } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { useLingui } from "@lingui/react/macro"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { TRPCClientError } from "@trpc/client"
import { Stack, DataGridToolbar, SearchInput, Status } from "@cloudoperators/juno-ui-components"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { TrpcClient } from "@/client/trpcClient"
import type { Router, RouterQueryParameters } from "@/server/Network/types/router"
import type { RoutersSearchParams } from "@/client/routes/_auth/projects/$projectId/network/routers/index"
import { RouterListContainer } from "./RouterListContainer"

const PAGE_SIZE = 50

type RouterSortKey = NonNullable<RouterQueryParameters["sort_key"]>

interface RoutersProps {
  client: TrpcClient
  project: string
}

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: RouterSortKey
  sortDirection: "asc" | "desc"
}

type RoutersResult = { routers: Router[]; listError?: string }

const createRoutersPromise = (
  client: TrpcClient,
  project: string,
  sortBy: RouterSortKey,
  sortDirection: "asc" | "desc",
  searchTerm: string
): Promise<RoutersResult> => {
  return client.network.routers.list
    .query({ project_id: project, sort_key: sortBy, sort_dir: sortDirection, searchTerm: searchTerm || undefined })
    .then((routers) => ({ routers, listError: undefined }))
    .catch((err: unknown) => {
      if (err instanceof TRPCClientError && err.data?.code === "FORBIDDEN") {
        return { routers: [], listError: err.message }
      }
      throw err
    })
}

function RoutersContent({
  routersPromise,
  searchTerm,
  setSearchTerm,
  sortSettings,
  handleSortChange,
  currentPage,
  onPageChange,
}: {
  routersPromise: Promise<RoutersResult>
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortSettings: RequiredSortSettings
  handleSortChange: (settings: SortSettings) => void
  currentPage: number
  onPageChange: (page: number) => void
}) {
  const { t } = useLingui()
  const { routers, listError } = use(routersPromise)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debounceTimer = useRef<number | undefined>(undefined)

  const totalPages = Math.max(1, Math.ceil(routers.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedRouters = routers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  useEffect(() => {
    if (currentPage > totalPages) onPageChange(1)
  }, [totalPages, currentPage, onPageChange])

  if (listError) {
    return <Status status="error" title={t`Failed to Load Routers`} body={listError} />
  }

  return (
    <>
      {/* Zone 1 — sort, no background */}
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        <SortInput
          options={sortSettings.options}
          sortBy={sortSettings.sortBy}
          sortDirection={sortSettings.sortDirection}
          selectClassName="min-w-45"
          selectWidth="auto"
          onSortByChange={(v) => handleSortChange({ ...sortSettings, sortBy: v })}
          onSortDirectionChange={(dir) => handleSortChange({ ...sortSettings, sortDirection: dir })}
        />
      </Stack>

      {/* Zone 2 — search bar */}
      <DataGridToolbar>
        <Stack distribution="end" alignment="center">
          <SearchInput
            placeholder={t`Search routers...`}
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
      </DataGridToolbar>

      <RouterListContainer
        routers={paginatedRouters}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}

export const Routers = ({ client, project }: RoutersProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as RoutersSearchParams

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Status`, value: "status" },
    ],
    sortBy: searchParams.sortBy || "name",
    sortDirection: searchParams.sortDirection || "asc",
  })

  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const currentPage = searchParams.page ?? 1

  const [routersPromise, setRoutersPromise] = useState(() =>
    createRoutersPromise(client, project, sortSettings.sortBy, sortSettings.sortDirection, searchTerm)
  )

  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options,
      sortBy: (newSortSettings.sortBy?.toString() || "name") as RouterSortKey,
      sortDirection: newSortSettings.sortDirection || "asc",
    }

    setSortSettings(settings)
    navigate({
      search: ((prev: RoutersSearchParams) => ({
        ...prev,
        sortBy: settings.sortBy,
        sortDirection: settings.sortDirection,
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
    startTransition(() => {
      setRoutersPromise(createRoutersPromise(client, project, settings.sortBy, settings.sortDirection, searchTerm))
    })
  }

  const handleSearchChange = (term: string) => {
    setSearchTerm(term)

    navigate({
      search: ((prev: RoutersSearchParams) => ({
        ...prev,
        search: term || undefined,
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
    startTransition(() => {
      setRoutersPromise(createRoutersPromise(client, project, sortSettings.sortBy, sortSettings.sortDirection, term))
    })
  }

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({
        search: ((prev: RoutersSearchParams) => ({
          ...prev,
          page: page === 1 ? undefined : page,
        })) as unknown as true,
      })
    },
    [navigate]
  )

  return (
    <div className="relative">
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Status
            status="error"
            title={t`Failed to Load Routers`}
            body={error instanceof Error ? error.message : t`An unexpected error occurred.`}
          />
        )}
      >
        <Suspense fallback={<Status status="progress" title={t`Loading Routers...`} />}>
          <RoutersContent
            routersPromise={routersPromise}
            searchTerm={searchTerm}
            setSearchTerm={handleSearchChange}
            sortSettings={sortSettings}
            handleSortChange={handleSortChange}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
