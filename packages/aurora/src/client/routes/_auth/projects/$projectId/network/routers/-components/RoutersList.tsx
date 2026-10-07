import { use, Suspense, useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from "react"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { ErrorBoundary } from "react-error-boundary"
import { Trans, useLingui } from "@lingui/react/macro"
import { TRPCClientError } from "@trpc/client"
import { TrpcClient } from "@/client/trpcClient"
import { Button, Stack, DataGridToolbar, SearchInput, Status } from "@cloudoperators/juno-ui-components"
import type { RouterListItem, RouterQueryParameters } from "@/server/Network/types/router"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
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

type RoutersResult = { routers: RouterListItem[]; listError?: string }

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
  isStale,
}: {
  routersPromise: Promise<RoutersResult>
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortSettings: RequiredSortSettings
  handleSortChange: (settings: SortSettings) => void
  currentPage: number
  onPageChange: (page: number) => void
  /** True while the shown routers are from the previous query and the next one is still loading */
  isStale: boolean
}) {
  const { t } = useLingui()
  const { routers, listError } = use(routersPromise)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debounceTimer = useRef<number | undefined>(undefined)
  // Last term this input sent to the URL, so only external URL changes (back/forward, links) overwrite the input
  const submittedSearchTerm = useRef(searchTerm)

  const submitSearchTerm = (term: string) => {
    clearTimeout(debounceTimer.current)
    submittedSearchTerm.current = term
    setSearchTerm(term)
  }

  const totalPages = Math.max(1, Math.ceil(routers.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedRouters = routers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  useEffect(() => {
    if (searchTerm === submittedSearchTerm.current) return
    clearTimeout(debounceTimer.current)
    submittedSearchTerm.current = searchTerm
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  // Validate the page only against the current query's result: while the previous result is still shown,
  // its page count says nothing about the URL's page (e.g. back/forward from a filtered to an unfiltered list).
  useEffect(() => {
    if (!isStale && currentPage > totalPages) onPageChange(1)
  }, [isStale, totalPages, currentPage, onPageChange])

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
              debounceTimer.current = window.setTimeout(() => submitSearchTerm(v), 500)
            }}
            onSearch={(v) => submitSearchTerm(typeof v === "string" ? v : "")}
            onClear={() => {
              setLocalSearchTerm("")
              submitSearchTerm("")
            }}
          />
        </Stack>
      </DataGridToolbar>

      <RouterListContainer
        routers={paginatedRouters}
        hasSearch={Boolean(searchTerm.trim())}
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

  // The URL is the single source of truth for search, sort and page, so back/forward navigation
  // and links with different search params update the controls and the query.
  const searchTerm = searchParams.search ?? ""
  const sortBy: RouterSortKey = searchParams.sortBy || "name"
  const sortDirection = searchParams.sortDirection || "asc"
  const currentPage = searchParams.page ?? 1

  const sortSettings: RequiredSortSettings = {
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Status`, value: "status" },
    ],
    sortBy,
    sortDirection,
  }

  // Bumped by "Try Again" to create a fresh query with the same parameters
  const [retryCount, setRetryCount] = useState(0)

  const routersPromise = useMemo(
    () => createRoutersPromise(client, project, sortBy, sortDirection, searchTerm),
    // retryCount is not used in the factory, it only forces a new promise on "Try Again"
    [client, project, sortBy, sortDirection, searchTerm, retryCount]
  )
  // Keeps the current list (and the search input) on screen while the next query loads,
  // instead of falling back to the Suspense loading state on every search or sort change
  const deferredRoutersPromise = useDeferredValue(routersPromise)
  const isStale = deferredRoutersPromise !== routersPromise

  const handleSortChange = (newSortSettings: SortSettings) => {
    navigate({
      search: ((prev: RoutersSearchParams) => ({
        ...prev,
        sortBy: (newSortSettings.sortBy?.toString() || "name") as RouterSortKey,
        sortDirection: newSortSettings.sortDirection || "asc",
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
  }

  const handleSearchChange = (term: string) => {
    navigate({
      search: ((prev: RoutersSearchParams) => ({
        ...prev,
        search: term || undefined,
        page: undefined,
      })) as unknown as true,
      replace: true,
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
        // Resets the boundary whenever the query changes: on "Try Again" and when the URL
        // (project, search, sort) changes. Keyed on the deferred promise, so the reset happens
        // together with the render that uses the new query instead of re-throwing the failed one.
        resetKeys={[deferredRoutersPromise]}
        fallbackRender={({ error }) => (
          <Status
            status="error"
            title={t`Failed to Load Routers`}
            body={error instanceof Error ? error.message : t`An unexpected error occurred.`}
            action={
              <Button onClick={() => setRetryCount((count) => count + 1)}>
                <Trans>Try Again</Trans>
              </Button>
            }
          />
        )}
      >
        <Suspense fallback={<Status status="progress" title={t`Loading Routers...`} />}>
          <RoutersContent
            routersPromise={deferredRoutersPromise}
            searchTerm={searchTerm}
            setSearchTerm={handleSearchChange}
            sortSettings={sortSettings}
            handleSortChange={handleSortChange}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            isStale={isStale}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
