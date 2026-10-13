import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { TRPCClientError } from "@trpc/client"
import type { TrpcClient } from "@/client/trpcClient"
import type { NetworkListItem } from "@/server/Network/types/network"
import type { Filter, SelectedFilter } from "@/client/components/ListToolbar/types"
import { Networks } from "./NetworksList"

// Mocked URL search params as a small external store, so navigate() re-renders like the real router
const { searchStore } = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  return {
    searchStore: {
      params: {} as Record<string, unknown>,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      set(params: Record<string, unknown>) {
        this.params = params
        listeners.forEach((listener) => listener())
      },
    },
  }
})

const setUrlSearch = (params: Record<string, unknown>) => searchStore.set(params)

const mockNavigate = vi.fn(
  (opts: { search: (prev: Record<string, unknown>) => Record<string, unknown>; replace?: boolean }) => {
    if (typeof opts.search === "function") {
      setUrlSearch(opts.search(searchStore.params))
    }
  }
)

vi.mock("@tanstack/react-router", async () => {
  const { useSyncExternalStore } = await import("react")
  return {
    useSearch: () => useSyncExternalStore(searchStore.subscribe, () => searchStore.params),
    useNavigate: () => mockNavigate,
  }
})

vi.mock("./NetworkListContainer", () => ({
  NetworkListContainer: ({
    networks,
    isFiltered,
    currentPage,
    totalPages,
    onPageChange,
  }: {
    networks?: NetworkListItem[]
    isFiltered?: boolean
    currentPage?: number
    totalPages?: number
    onPageChange?: (page: number) => void
  }) => (
    <div
      data-testid="network-list-container"
      data-is-filtered={String(Boolean(isFiltered))}
      data-current-page={currentPage}
      data-total-pages={totalPages}
    >
      {networks?.map((network) => (
        <div key={network.id} data-testid={`network-${network.id}`}>
          {network.name}
        </div>
      ))}
      <button onClick={() => onPageChange?.(2)}>Go to page 2</button>
    </div>
  ),
}))

// The toolbar components have their own tests; here they only expose their callbacks
vi.mock("@/client/components/ListToolbar/FiltersInput", () => ({
  FiltersInput: ({ filters, onChange }: { filters: Filter[]; onChange: (filter: SelectedFilter) => void }) => (
    <div data-testid="filters-input" data-filters={filters.map((filter) => filter.filterName).join(",")}>
      <button onClick={() => onChange({ name: "status", value: "DOWN" })}>Select status DOWN</button>
      <button onClick={() => onChange({ name: "shared", value: "true" })}>Select shared true</button>
      <button onClick={() => onChange({ name: "status", value: "UNKNOWN" })}>Select unknown status</button>
    </div>
  ),
}))

vi.mock("@/client/components/ListToolbar/SelectedFilters", () => ({
  SelectedFilters: ({
    selectedFilters,
    onDelete,
    onClear,
  }: {
    selectedFilters: SelectedFilter[]
    onDelete: (filter: SelectedFilter) => void
    onClear: () => void
  }) => (
    <div data-testid="selected-filters">
      {selectedFilters.map((filter) => (
        <button key={filter.name} onClick={() => onDelete(filter)}>
          Remove {filter.name}={filter.value}
        </button>
      ))}
      <button onClick={onClear}>Clear all</button>
    </div>
  ),
}))

const makeNetwork = (id: string, name = id): NetworkListItem => ({
  id,
  name,
  description: "",
  status: "ACTIVE",
  admin_state_up: true,
  shared: false,
  subnets: [],
  subnet_details: [],
  project_id: "proj-1",
})

const mockNetworks = [makeNetwork("net-1", "private"), makeNetwork("net-2", "db")]

const defaultQuery = {
  project_id: "proj-1",
  sort_key: "name",
  sort_dir: "asc",
  searchTerm: undefined,
  status: undefined,
  shared: undefined,
}

const createMockClient = (query: ReturnType<typeof vi.fn>) =>
  ({ network: { networks: { list: { query } } } }) as unknown as TrpcClient

const forbiddenError = () =>
  new TRPCClientError("You are not allowed to list networks", {
    result: {
      error: {
        code: -32603,
        message: "You are not allowed to list networks",
        data: { code: "FORBIDDEN", httpStatus: 403 },
      },
    },
  } as never)

// The list suspends on a promise (React `use`), so render inside an async act scope to let it resolve
const renderList = async (query = vi.fn().mockResolvedValue(mockNetworks)) => {
  const client = createMockClient(query)
  await act(async () => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <Networks client={client} project="proj-1" />
        </PortalProvider>
      </I18nProvider>
    )
  })
  return { query }
}

const lastNavigateSearch = (prev: Record<string, unknown> = {}) => {
  const [opts] = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1]
  return opts.search(prev)
}

describe("Networks", () => {
  beforeEach(() => {
    i18n.activate("en")
    searchStore.params = {}
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Loading data", () => {
    it("shows a loading state until networks are loaded", async () => {
      await renderList(vi.fn(() => new Promise(() => {})))

      expect(await screen.findByText("Loading Networks...")).toBeInTheDocument()
      expect(screen.queryByTestId("network-list-container")).not.toBeInTheDocument()
    })

    it("renders the loaded networks", async () => {
      await renderList()

      expect(await screen.findByTestId("network-net-1")).toHaveTextContent("private")
      expect(screen.getByTestId("network-net-2")).toHaveTextContent("db")
    })

    it("queries networks for the project with default sorting and no filters", async () => {
      const { query } = await renderList()

      await screen.findByTestId("network-list-container")

      expect(query).toHaveBeenCalledWith(defaultQuery)
    })

    it("uses search, sort, direction and filters from the URL for the initial query", async () => {
      searchStore.params = { search: "priv", sortBy: "mtu", sortDirection: "desc", status: "DOWN", shared: "false" }
      const { query } = await renderList()

      await screen.findByTestId("network-list-container")

      expect(query).toHaveBeenCalledWith({
        project_id: "proj-1",
        sort_key: "mtu",
        sort_dir: "desc",
        searchTerm: "priv",
        status: "DOWN",
        shared: false,
      })
      expect(screen.getByRole("searchbox")).toHaveValue("priv")
    })

    it("does not render a create action (read-only)", async () => {
      await renderList()

      await screen.findByTestId("network-list-container")

      expect(screen.queryByRole("button", { name: /create network/i })).not.toBeInTheDocument()
    })
  })

  describe("Errors", () => {
    it("shows an inline error when listing is forbidden", async () => {
      await renderList(vi.fn().mockRejectedValue(forbiddenError()))

      expect(await screen.findByText("You are not allowed to list networks")).toBeInTheDocument()
      expect(screen.getByText("Failed to Load Networks")).toBeInTheDocument()
      expect(screen.queryByTestId("network-list-container")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
    })

    it("shows the error boundary fallback for other errors and retries", async () => {
      const user = userEvent.setup()
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
      const query = vi.fn().mockRejectedValueOnce(new Error("Neutron is unavailable")).mockResolvedValue(mockNetworks)
      await renderList(query)

      expect(await screen.findByText("Neutron is unavailable")).toBeInTheDocument()
      // The retried query suspends again (React `use`), so let it resolve inside an async act scope
      await act(async () => {
        await user.click(screen.getByRole("button", { name: "Try Again" }))
      })

      expect(await screen.findByTestId("network-net-1")).toBeInTheDocument()
      expect(query).toHaveBeenCalledTimes(2)
      expect(query).toHaveBeenLastCalledWith(defaultQuery)

      consoleError.mockRestore()
    })
  })

  describe("Search", () => {
    it("refetches with the search term and updates the URL on submit", async () => {
      const user = userEvent.setup()
      const { query } = await renderList()

      await screen.findByTestId("network-list-container")
      await user.type(screen.getByRole("searchbox"), "db{enter}")

      await waitFor(() => {
        expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ searchTerm: "db" }))
      })
      expect(mockNavigate).toHaveBeenLastCalledWith(expect.objectContaining({ replace: true }))
      expect(lastNavigateSearch()).toEqual({ search: "db", page: undefined })
    })
  })

  describe("Filters", () => {
    it("offers status and shared filters", async () => {
      await renderList()

      expect(await screen.findByTestId("filters-input")).toHaveAttribute("data-filters", "status,shared")
    })

    it("sets the status filter in the URL and refetches", async () => {
      const user = userEvent.setup()
      searchStore.params = { page: 2 }
      const { query } = await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Select status DOWN" }))

      expect(searchStore.params).toEqual({ status: "DOWN", page: undefined })
      await waitFor(() => {
        expect(query).toHaveBeenLastCalledWith({ ...defaultQuery, status: "DOWN" })
      })
    })

    it("maps the shared filter to a boolean", async () => {
      const user = userEvent.setup()
      const { query } = await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Select shared true" }))

      expect(searchStore.params).toEqual({ shared: "true", page: undefined })
      await waitFor(() => {
        expect(query).toHaveBeenLastCalledWith({ ...defaultQuery, shared: true })
      })
    })

    it("ignores unknown filter values", async () => {
      const user = userEvent.setup()
      await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Select unknown status" }))

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("shows no selected filters without filters in the URL", async () => {
      await renderList()
      await screen.findByTestId("network-list-container")

      expect(screen.queryByTestId("selected-filters")).not.toBeInTheDocument()
    })

    it("removes a single filter", async () => {
      const user = userEvent.setup()
      searchStore.params = { status: "DOWN", shared: "true" }
      await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Remove status=DOWN" }))

      expect(searchStore.params).toEqual({ status: undefined, shared: "true", page: undefined })
    })

    it("clears all filters but keeps the search", async () => {
      const user = userEvent.setup()
      searchStore.params = { status: "DOWN", shared: "true", search: "db" }
      await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Clear all" }))

      expect(searchStore.params).toEqual({ status: undefined, shared: undefined, search: "db", page: undefined })
    })
  })

  describe("Empty state", () => {
    it.each([
      [{ search: "nomatch" }, "true"],
      [{ status: "ERROR" }, "true"],
      [{}, "false"],
    ])("tells the container whether a search or filter is applied (%j)", async (params, expected) => {
      searchStore.params = params
      await renderList(vi.fn().mockResolvedValue([]))

      expect(await screen.findByTestId("network-list-container")).toHaveAttribute("data-is-filtered", expected)
    })
  })

  describe("URL changes", () => {
    it("refetches and updates the search input when the URL search params change (e.g. back/forward)", async () => {
      const { query } = await renderList()
      await screen.findByTestId("network-list-container")

      await act(async () => {
        setUrlSearch({ search: "backend", sortBy: "status", sortDirection: "desc" })
      })

      await waitFor(() => {
        expect(query).toHaveBeenLastCalledWith({
          ...defaultQuery,
          sort_key: "status",
          sort_dir: "desc",
          searchTerm: "backend",
        })
      })
      expect(screen.getByRole("searchbox")).toHaveValue("backend")
    })

    it("does not refetch when only the page changes", async () => {
      const { query } = await renderList()
      await screen.findByTestId("network-list-container")

      await act(async () => {
        setUrlSearch({ page: 2 })
      })

      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe("Pagination", () => {
    const manyNetworks = Array.from({ length: 51 }, (_, i) => makeNetwork(`net-${i}`))

    it("shows 50 networks per page", async () => {
      await renderList(vi.fn().mockResolvedValue(manyNetworks))

      const container = await screen.findByTestId("network-list-container")

      expect(container).toHaveAttribute("data-total-pages", "2")
      expect(container).toHaveAttribute("data-current-page", "1")
      expect(screen.getByTestId("network-net-0")).toBeInTheDocument()
      expect(screen.queryByTestId("network-net-50")).not.toBeInTheDocument()
    })

    it("shows the page from the URL", async () => {
      searchStore.params = { page: 2 }
      await renderList(vi.fn().mockResolvedValue(manyNetworks))

      const container = await screen.findByTestId("network-list-container")

      expect(container).toHaveAttribute("data-current-page", "2")
      expect(screen.getByTestId("network-net-50")).toBeInTheDocument()
    })

    it("updates the page in the URL on page change", async () => {
      const user = userEvent.setup()
      await renderList(vi.fn().mockResolvedValue(manyNetworks))

      await screen.findByTestId("network-list-container")
      await user.click(screen.getByRole("button", { name: "Go to page 2" }))

      expect(lastNavigateSearch()).toEqual({ page: 2 })
    })

    it("resets an out-of-range page to the first page", async () => {
      searchStore.params = { page: 5 }
      await renderList()

      await waitFor(() => {
        expect(searchStore.params.page).toBeUndefined()
      })
    })
  })
})
