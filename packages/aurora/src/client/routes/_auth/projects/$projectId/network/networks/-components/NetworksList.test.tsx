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
  NetworkListContainer: ({ networks, isFiltered }: { networks?: NetworkListItem[]; isFiltered?: boolean }) => (
    <div data-testid="network-list-container" data-is-filtered={String(Boolean(isFiltered))}>
      {networks?.map((network) => (
        <div key={network.id} data-testid={`network-${network.id}`}>
          {network.name}
        </div>
      ))}
    </div>
  ),
}))

// The toolbar components have their own tests; here they only expose their callbacks
vi.mock("@/client/components/ListToolbar/FiltersInput", () => ({
  FiltersInput: ({ filters, onChange }: { filters: Filter[]; onChange: (filter: SelectedFilter) => void }) => (
    <div data-testid="filters-input" data-filters={filters.map((filter) => filter.filterName).join(",")}>
      <button onClick={() => onChange({ name: "status", value: "DOWN" })}>Select status DOWN</button>
      <button onClick={() => onChange({ name: "shared", value: "true" })}>Select shared true</button>
      <button onClick={() => onChange({ name: "external", value: "true" })}>Select external true</button>
      <button onClick={() => onChange({ name: "external", value: "false" })}>Select external false</button>
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

const makeNetwork = (id: string, name = id, overrides: Partial<NetworkListItem> = {}): NetworkListItem => ({
  id,
  name,
  description: "",
  status: "ACTIVE",
  admin_state_up: true,
  shared: false,
  subnets: [],
  subnet_details: [],
  project_id: "proj-1",
  ...overrides,
})

// net-1 ACTIVE, own, internal, 2 subnets · net-2 DOWN, shared, internal, 0 subnets · net-3 ACTIVE, own, external, 1 subnet
const mockNetworks = [
  makeNetwork("net-1", "private", { status: "ACTIVE", shared: false, "router:external": false, subnets: ["a", "b"] }),
  makeNetwork("net-2", "db", { status: "DOWN", shared: true, "router:external": false, subnets: [] }),
  makeNetwork("net-3", "corp", { status: "ACTIVE", shared: false, "router:external": true, subnets: ["c"] }),
]

const LIST_ONLY_QUERY = { project_id: "proj-1" }

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

/** IDs of the rows the (mocked) container renders, in DOM order. */
const visibleNetworkIds = () => screen.getAllByTestId(/^network-net-/).map((el) => el.getAttribute("data-testid"))

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
      expect(screen.getByTestId("network-net-3")).toHaveTextContent("corp")
    })

    it("fetches the list once with only the project_id (no search/filter/sort params)", async () => {
      const { query } = await renderList()

      await screen.findByTestId("network-list-container")

      expect(query).toHaveBeenCalledTimes(1)
      expect(query).toHaveBeenCalledWith(LIST_ONLY_QUERY)
    })

    it("does not refetch when search, filter or sort change (client-side, E5)", async () => {
      const user = userEvent.setup()
      const { query } = await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Select status DOWN" }))
      await act(async () => setUrlSearch({ status: "DOWN", sortBy: "subnet_count", search: "db" }))

      expect(query).toHaveBeenCalledTimes(1)
    })

    it("does not render a create action (read-only)", async () => {
      await renderList()

      await screen.findByTestId("network-list-container")

      expect(screen.queryByRole("button", { name: /create network/i })).not.toBeInTheDocument()
    })

    it("displays the network count in Zone 3", async () => {
      await renderList()

      await screen.findByTestId("network-list-container")

      expect(screen.getByText("3 networks")).toBeInTheDocument()
    })
  })

  describe("Errors", () => {
    it("shows an inline error when listing is forbidden", async () => {
      await renderList(vi.fn().mockRejectedValue(forbiddenError()))

      expect(await screen.findByText("Insufficient Permissions")).toBeInTheDocument()
      expect(
        screen.getByText("You do not have the required permissions to view networks in this project.")
      ).toBeInTheDocument()
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
      expect(query).toHaveBeenLastCalledWith(LIST_ONLY_QUERY)

      consoleError.mockRestore()
    })
  })

  describe("Search", () => {
    it("filters client-side by the search term and updates the URL on submit", async () => {
      const user = userEvent.setup()
      const { query } = await renderList()

      await screen.findByTestId("network-list-container")
      await user.type(screen.getByRole("searchbox"), "db{enter}")

      await waitFor(() => expect(visibleNetworkIds()).toEqual(["network-net-2"]))
      expect(query).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenLastCalledWith(expect.objectContaining({ replace: true }))
      expect(lastNavigateSearch()).toEqual({ search: "db" })
    })

    it("updates the shown count to the filtered total", async () => {
      searchStore.params = { search: "db" }
      await renderList()

      await screen.findByTestId("network-list-container")

      expect(screen.getByText("1 networks")).toBeInTheDocument()
    })
  })

  describe("Filters", () => {
    it("offers status, shared and external filters", async () => {
      await renderList()

      expect(await screen.findByTestId("filters-input")).toHaveAttribute("data-filters", "status,shared,external")
    })

    it("sets the status filter in the URL and filters client-side", async () => {
      const user = userEvent.setup()
      await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Select status DOWN" }))

      expect(searchStore.params).toEqual({ status: "DOWN" })
      await waitFor(() => expect(visibleNetworkIds()).toEqual(["network-net-2"]))
    })

    it("filters by the shared flag", async () => {
      const user = userEvent.setup()
      await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Select shared true" }))

      expect(searchStore.params).toEqual({ shared: "true" })
      await waitFor(() => expect(visibleNetworkIds()).toEqual(["network-net-2"]))
    })

    it("filters by external=true", async () => {
      const user = userEvent.setup()
      await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Select external true" }))

      expect(searchStore.params).toEqual({ external: "true" })
      await waitFor(() => expect(visibleNetworkIds()).toEqual(["network-net-3"]))
    })

    it("filters by external=false", async () => {
      const user = userEvent.setup()
      await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Select external false" }))

      expect(searchStore.params).toEqual({ external: "false" })
      await waitFor(() => expect([...visibleNetworkIds()].sort()).toEqual(["network-net-1", "network-net-2"]))
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
      searchStore.params = { status: "DOWN", shared: "true", external: "true" }
      await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Remove status=DOWN" }))

      expect(searchStore.params).toEqual({ status: undefined, shared: "true", external: "true" })
    })

    it("clears all filters but keeps the search", async () => {
      const user = userEvent.setup()
      searchStore.params = { status: "DOWN", shared: "true", external: "false", search: "db" }
      await renderList()
      await screen.findByTestId("network-list-container")

      await user.click(screen.getByRole("button", { name: "Clear all" }))

      expect(searchStore.params).toEqual({
        status: undefined,
        shared: undefined,
        external: undefined,
        search: "db",
      })
    })
  })

  describe("Sorting", () => {
    it("sorts by name descending client-side", async () => {
      searchStore.params = { sortBy: "name", sortDirection: "desc" }
      await renderList()

      await screen.findByTestId("network-list-container")

      // names: corp, db, private → desc → private, db, corp
      expect(visibleNetworkIds()).toEqual(["network-net-1", "network-net-2", "network-net-3"])
    })

    it("sorts by subnet count descending client-side", async () => {
      searchStore.params = { sortBy: "subnet_count", sortDirection: "desc" }
      await renderList()

      await screen.findByTestId("network-list-container")

      // subnet counts: net-1=2, net-3=1, net-2=0
      expect(visibleNetworkIds()).toEqual(["network-net-1", "network-net-3", "network-net-2"])
    })

    it("sorts by status in attention-first order (E3)", async () => {
      searchStore.params = { sortBy: "status", sortDirection: "asc" }
      await renderList()

      await screen.findByTestId("network-list-container")

      // status order ERROR→BUILD→DOWN→ACTIVE: net-2 (DOWN) before the ACTIVE ones (stable)
      expect(visibleNetworkIds()).toEqual(["network-net-2", "network-net-1", "network-net-3"])
    })
  })

  describe("Empty state", () => {
    it.each([
      [{ search: "nomatch" }, "true"],
      [{ status: "ERROR" }, "true"],
      [{ external: "true" }, "true"],
      [{}, "false"],
    ])("tells the container whether a search or filter is applied (%j)", async (params, expected) => {
      searchStore.params = params
      await renderList(vi.fn().mockResolvedValue([]))

      expect(await screen.findByTestId("network-list-container")).toHaveAttribute("data-is-filtered", expected)
    })
  })

  describe("URL changes", () => {
    it("re-filters and updates the search input when the URL search params change (e.g. back/forward)", async () => {
      const { query } = await renderList()
      await screen.findByTestId("network-list-container")

      await act(async () => {
        setUrlSearch({ search: "corp" })
      })

      await waitFor(() => expect(visibleNetworkIds()).toEqual(["network-net-3"]))
      expect(screen.getByRole("searchbox")).toHaveValue("corp")
      expect(query).toHaveBeenCalledTimes(1)
    })
  })
})
