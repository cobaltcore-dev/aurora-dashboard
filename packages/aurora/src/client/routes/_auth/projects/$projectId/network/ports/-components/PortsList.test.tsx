import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { TRPCClientError } from "@trpc/client"
import type { TrpcClient } from "@/client/trpcClient"
import type { PortListItem } from "@/server/Network/types/port"
import { Ports } from "./PortsList"

// Mocked URL search params as a small external store, so navigate() re-renders like the real route
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

vi.mock("./PortListContainer", () => ({
  PortListContainer: ({
    ports,
    hasSearch,
    isNetworkScoped,
    currentPage,
    totalPages,
    onPageChange,
  }: {
    ports?: PortListItem[]
    hasSearch?: boolean
    isNetworkScoped?: boolean
    currentPage?: number
    totalPages?: number
    onPageChange?: (page: number) => void
  }) => (
    <div
      data-testid="port-list-container"
      data-has-search={String(Boolean(hasSearch))}
      data-network-scoped={String(Boolean(isNetworkScoped))}
      data-current-page={currentPage}
      data-total-pages={totalPages}
    >
      {ports?.map((port) => (
        <div key={port.id} data-testid={`port-${port.id}`}>
          {port.name}
        </div>
      ))}
      <button onClick={() => onPageChange?.(2)}>Go to page 2</button>
    </div>
  ),
}))

const makePort = (id: string, name = id): PortListItem => ({
  id,
  name,
  description: "",
  network_id: "net-1",
  mac_address: "fa:16:3e:50:a2:79",
  admin_state_up: true,
  status: "ACTIVE",
  device_id: "",
  device_owner: "",
  fixed_ips: [],
  security_groups: [],
  allowed_address_pairs: [],
  project_id: "proj-1",
})

const mockPorts = [makePort("port-1", "edge-port"), makePort("port-2", "internal-port")]

const createMockClient = (query: ReturnType<typeof vi.fn>) =>
  ({ network: { ports: { list: { query } } } }) as unknown as TrpcClient

// The list suspends on a promise (React `use`), so render inside an async act scope to let it resolve
const renderList = async (query = vi.fn().mockResolvedValue(mockPorts), networkId?: string) => {
  const client = createMockClient(query)
  await act(async () => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <Ports client={client} project="proj-1" networkId={networkId} />
        </PortalProvider>
      </I18nProvider>
    )
  })
  return { query }
}

const lastNavigateSearch = () => {
  const [opts] = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1]
  return opts.search({})
}

/** Testids of the rendered port rows, in DOM order (to assert client-side sorting). */
const renderedPortIds = () =>
  Array.from(document.querySelectorAll('[data-testid^="port-port-"]')).map((el) => el.getAttribute("data-testid"))

describe("Ports", () => {
  beforeEach(() => {
    i18n.activate("en")
    searchStore.params = {}
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Loading data", () => {
    it("shows a loading state until ports are loaded", async () => {
      await renderList(vi.fn(() => new Promise(() => {})))

      expect(await screen.findByText("Loading Ports...")).toBeInTheDocument()
      expect(screen.queryByTestId("port-list-container")).not.toBeInTheDocument()
    })

    it("renders the loaded ports", async () => {
      await renderList()

      expect(await screen.findByTestId("port-port-1")).toHaveTextContent("edge-port")
      expect(screen.getByTestId("port-port-2")).toHaveTextContent("internal-port")
    })

    it("fetches the full list for the project once, without sort or search params", async () => {
      const { query } = await renderList()

      await screen.findByTestId("port-list-container")

      expect(query).toHaveBeenCalledTimes(1)
      expect(query).toHaveBeenCalledWith({ project_id: "proj-1", network_id: undefined })
    })

    it("applies the search and sort from the URL client-side, not via the query", async () => {
      searchStore.params = { search: "edge", sortBy: "status", sortDirection: "desc" }
      const { query } = await renderList()

      await screen.findByTestId("port-list-container")

      // The fetch is unaffected by sort/search; they are applied in memory
      expect(query).toHaveBeenCalledWith({ project_id: "proj-1", network_id: undefined })
      expect(screen.getByRole("searchbox")).toHaveValue("edge")
      // "edge" matches only port-1
      expect(screen.getByTestId("port-port-1")).toBeInTheDocument()
      expect(screen.queryByTestId("port-port-2")).not.toBeInTheDocument()
    })

    it("does not render a create action (read-only)", async () => {
      await renderList()

      await screen.findByTestId("port-list-container")

      expect(screen.queryByRole("button", { name: /create port/i })).not.toBeInTheDocument()
    })
  })

  describe("Network scope", () => {
    it("fetches only the ports of the given network", async () => {
      const { query } = await renderList(undefined, "net-1")

      await screen.findByTestId("port-list-container")

      expect(query).toHaveBeenCalledWith({ project_id: "proj-1", network_id: "net-1" })
    })

    it("tells the container that the list is scoped to a network", async () => {
      await renderList(undefined, "net-1")

      expect(await screen.findByTestId("port-list-container")).toHaveAttribute("data-network-scoped", "true")
    })

    it("does not filter by network in the global view", async () => {
      const { query } = await renderList()

      expect(await screen.findByTestId("port-list-container")).toHaveAttribute("data-network-scoped", "false")
      expect(query.mock.calls[0][0].network_id).toBeUndefined()
    })
  })

  describe("Sorting", () => {
    it("sorts client-side when the URL sort changes, without refetching", async () => {
      const ports = [makePort("port-a", "beta"), makePort("port-b", "alpha")]
      const { query } = await renderList(vi.fn().mockResolvedValue(ports))
      await screen.findByTestId("port-list-container")

      // Default: name ascending → alpha (port-b) before beta (port-a)
      expect(renderedPortIds()).toEqual(["port-port-b", "port-port-a"])

      await act(async () => {
        setUrlSearch({ sortBy: "name", sortDirection: "desc" })
      })

      expect(renderedPortIds()).toEqual(["port-port-a", "port-port-b"])
      // Sorting is client-side: the list was fetched only once
      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe("Errors", () => {
    it("shows a page-level info message when listing is forbidden", async () => {
      const forbidden = new TRPCClientError("You are not allowed to list ports", {
        result: {
          error: {
            code: -32603,
            message: "You are not allowed to list ports",
            data: { code: "FORBIDDEN", httpStatus: 403 },
          },
        },
      } as never)
      await renderList(vi.fn().mockRejectedValue(forbidden))

      expect(await screen.findByText("Insufficient Permissions")).toBeInTheDocument()
      expect(
        screen.getByText("You do not have the required permissions to view ports in this project.")
      ).toBeInTheDocument()
      // The raw BFF message is not surfaced, and it is not shown as a red error state
      expect(screen.queryByText("You are not allowed to list ports")).not.toBeInTheDocument()
      expect(screen.queryByText("Failed to Load Ports")).not.toBeInTheDocument()
      expect(screen.queryByTestId("port-list-container")).not.toBeInTheDocument()
    })

    it("shows the error boundary fallback for other errors", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
      await renderList(vi.fn().mockRejectedValue(new Error("Neutron is unavailable")))

      expect(await screen.findByText("Failed to Load Ports")).toBeInTheDocument()
      expect(screen.getByText("Neutron is unavailable")).toBeInTheDocument()

      consoleError.mockRestore()
    })
  })

  describe("Retry", () => {
    it("fetches again when Try Again is clicked", async () => {
      const user = userEvent.setup()
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
      const query = vi.fn().mockRejectedValueOnce(new Error("Neutron is unavailable")).mockResolvedValue(mockPorts)
      await renderList(query)

      await user.click(await screen.findByRole("button", { name: "Try Again" }))

      expect(await screen.findByTestId("port-port-1")).toBeInTheDocument()
      expect(screen.queryByText("Failed to Load Ports")).not.toBeInTheDocument()
      expect(query).toHaveBeenCalledTimes(2)
      expect(query).toHaveBeenLastCalledWith({ project_id: "proj-1", network_id: undefined })

      consoleError.mockRestore()
    })

    it("does not offer a retry for a forbidden list", async () => {
      const forbidden = new TRPCClientError("You are not allowed to list ports", {
        result: {
          error: {
            code: -32603,
            message: "You are not allowed to list ports",
            data: { code: "FORBIDDEN", httpStatus: 403 },
          },
        },
      } as never)
      await renderList(vi.fn().mockRejectedValue(forbidden))

      await screen.findByText("Insufficient Permissions")
      expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
    })
  })

  describe("Search", () => {
    it("filters client-side and updates the URL on submit, without refetching", async () => {
      const user = userEvent.setup()
      const { query } = await renderList()

      await screen.findByTestId("port-list-container")
      await user.type(screen.getByRole("searchbox"), "edge{enter}")

      // "edge" matches only port-1; filtering is in memory
      await waitFor(() => {
        expect(screen.queryByTestId("port-port-2")).not.toBeInTheDocument()
      })
      expect(screen.getByTestId("port-port-1")).toBeInTheDocument()
      // The list was fetched once; typing does not refetch
      expect(query).toHaveBeenCalledTimes(1)
      // The URL still reflects the search for shareable links / back-forward
      expect(mockNavigate).toHaveBeenLastCalledWith(expect.objectContaining({ replace: true }))
      expect(lastNavigateSearch()).toEqual({ search: "edge", page: undefined })
    })
  })

  describe("Empty state", () => {
    it("tells the container whether a search is applied", async () => {
      searchStore.params = { search: "nomatch" }
      await renderList(vi.fn().mockResolvedValue([]))

      expect(await screen.findByTestId("port-list-container")).toHaveAttribute("data-has-search", "true")
    })

    it("reports no search without a search term", async () => {
      await renderList(vi.fn().mockResolvedValue([]))

      expect(await screen.findByTestId("port-list-container")).toHaveAttribute("data-has-search", "false")
    })
  })

  describe("URL changes", () => {
    it("updates the search input and filters when the URL changes (e.g. back/forward), without refetching", async () => {
      const { query } = await renderList()
      await screen.findByTestId("port-list-container")

      await act(async () => {
        setUrlSearch({ search: "internal" })
      })

      await waitFor(() => {
        expect(screen.getByRole("searchbox")).toHaveValue("internal")
      })
      // "internal" matches only port-2
      expect(screen.getByTestId("port-port-2")).toBeInTheDocument()
      expect(screen.queryByTestId("port-port-1")).not.toBeInTheDocument()
      expect(query).toHaveBeenCalledTimes(1)
    })

    it("clears the search input when the search is removed from the URL", async () => {
      searchStore.params = { search: "edge" }
      await renderList()
      await screen.findByTestId("port-list-container")

      await act(async () => {
        setUrlSearch({})
      })

      await waitFor(() => {
        expect(screen.getByRole("searchbox")).toHaveValue("")
      })
    })

    it("does not refetch when only the page changes", async () => {
      const { query } = await renderList()
      await screen.findByTestId("port-list-container")

      await act(async () => {
        setUrlSearch({ page: 2 })
      })

      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe("Pagination", () => {
    it("shows 50 ports per page", async () => {
      const manyPorts = Array.from({ length: 51 }, (_, i) => makePort(`port-${i}`))
      await renderList(vi.fn().mockResolvedValue(manyPorts))

      const container = await screen.findByTestId("port-list-container")

      expect(container).toHaveAttribute("data-total-pages", "2")
      expect(container).toHaveAttribute("data-current-page", "1")
      expect(screen.getByTestId("port-port-0")).toBeInTheDocument()
      expect(screen.queryByTestId("port-port-50")).not.toBeInTheDocument()
    })

    it("shows the page from the URL", async () => {
      searchStore.params = { page: 2 }
      const manyPorts = Array.from({ length: 51 }, (_, i) => makePort(`port-${i}`))
      await renderList(vi.fn().mockResolvedValue(manyPorts))

      const container = await screen.findByTestId("port-list-container")

      expect(container).toHaveAttribute("data-current-page", "2")
      expect(screen.getByTestId("port-port-50")).toBeInTheDocument()
      expect(screen.queryByTestId("port-port-0")).not.toBeInTheDocument()
    })

    it("updates the page in the URL on page change", async () => {
      const user = userEvent.setup()
      // Enough ports for a second page, otherwise the out-of-range reset navigates back to page 1
      const manyPorts = Array.from({ length: 51 }, (_, i) => makePort(`port-${i}`))
      await renderList(vi.fn().mockResolvedValue(manyPorts))

      const container = await screen.findByTestId("port-list-container")
      await user.click(screen.getByRole("button", { name: "Go to page 2" }))

      expect(lastNavigateSearch()).toEqual({ page: 2 })
      expect(container).toHaveAttribute("data-current-page", "2")
    })

    it("resets to the first page when the page in the URL is out of range", async () => {
      searchStore.params = { page: 5 }
      await renderList()

      await screen.findByTestId("port-list-container")

      await waitFor(() => {
        expect(lastNavigateSearch()).toEqual({ page: undefined })
      })
    })
  })
})
