import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FloatingIps } from "./List"
import { trpcReact } from "@/client/trpcClient"
import type { FloatingIp } from "@/server/Network/types/floatingIp"

// Simplified mock for tRPC useQuery - only includes properties actually used
type MockQueryResult<TData> = {
  data: TData | undefined
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  trpc: { path: string }
}

const createMockQueryResult = <TData,>(overrides: Partial<MockQueryResult<TData>> = {}) =>
  ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    trpc: { path: "network.floatingIp.list" },
    ...overrides,
  }) as ReturnType<typeof trpcReact.network.floatingIp.list.useQuery>

// Mock the tRPC client
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    network: {
      floatingIp: {
        list: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}))

// Mock FloatingIpListContainer
vi.mock("./-components/FloatingIpListContainer", () => ({
  FloatingIpListContainer: ({
    floatingIps,
    isLoading,
    isError,
    error,
  }: {
    floatingIps: FloatingIp[]
    isLoading: boolean
    isError: boolean
    error: { message?: string } | null
  }) => (
    <div data-testid="floating-ip-list-container">
      {isLoading && <div>Loading...</div>}
      {isError && <div data-testid="error">{error?.message || "Error"}</div>}
      {!isLoading && !isError && <div data-testid="floating-ips-data">{floatingIps.length} floating IPs</div>}
    </div>
  ),
}))

const mockFloatingIps: FloatingIp[] = [
  {
    id: "fip-1",
    floating_ip_address: "203.0.113.10",
    fixed_ip_address: "192.168.1.10",
    status: "ACTIVE",
    port_id: "port-1",
    router_id: "router-1",
    project_id: "project-1",
    tenant_id: "tenant-1",
    description: "Web server IP",
    dns_domain: "",
    dns_name: "",
    floating_network_id: "public-net",
    revision_number: 1,
    tags: [],
  },
  {
    id: "fip-2",
    floating_ip_address: "203.0.113.20",
    fixed_ip_address: "192.168.1.20",
    status: "DOWN",
    port_id: "port-2",
    router_id: "router-1",
    project_id: "project-1",
    tenant_id: "tenant-1",
    description: "Database server IP",
    dns_domain: "",
    dns_name: "",
    floating_network_id: "public-net",
    revision_number: 1,
    tags: [],
  },
]

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <PortalProvider>{children}</PortalProvider>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe("FloatingIps List", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  beforeEach(() => {
    i18n.activate("en")
  })

  describe("Component rendering", () => {
    it("renders with FloatingIpListContainer", () => {
      vi.mocked(trpcReact.network.floatingIp.list.useQuery).mockReturnValue(
        createMockQueryResult<FloatingIp[]>({
          data: mockFloatingIps,
        })
      )

      render(<FloatingIps />, { wrapper: createWrapper() })

      expect(screen.getByTestId("floating-ip-list-container")).toBeInTheDocument()
    })
  })

  describe("tRPC query", () => {
    it("calls tRPC with default sort parameters", () => {
      const mockUseQuery = vi.mocked(trpcReact.network.floatingIp.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<FloatingIp[]>({ data: [] }))

      render(<FloatingIps />, { wrapper: createWrapper() })

      expect(mockUseQuery).toHaveBeenCalledWith({
        sort_key: "fixed_ip_address",
        sort_dir: "asc",
      })
    })

    it("passes loading state", () => {
      vi.mocked(trpcReact.network.floatingIp.list.useQuery).mockReturnValue(
        createMockQueryResult<FloatingIp[]>({
          isLoading: true,
        })
      )

      render(<FloatingIps />, { wrapper: createWrapper() })

      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    it("passes error state", () => {
      vi.mocked(trpcReact.network.floatingIp.list.useQuery).mockReturnValue(
        createMockQueryResult<FloatingIp[]>({
          isError: true,
          error: { message: "Failed to fetch floating IPs" },
        })
      )

      render(<FloatingIps />, { wrapper: createWrapper() })

      expect(screen.getByTestId("error")).toHaveTextContent("Failed to fetch floating IPs")
    })

    it("passes floating IPs data", () => {
      vi.mocked(trpcReact.network.floatingIp.list.useQuery).mockReturnValue(
        createMockQueryResult<FloatingIp[]>({
          data: mockFloatingIps,
        })
      )

      render(<FloatingIps />, { wrapper: createWrapper() })

      expect(screen.getByTestId("floating-ips-data")).toHaveTextContent("2 floating IPs")
    })
  })

  describe("Sort functionality", () => {
    it("updates sort when field changes", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.floatingIp.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<FloatingIp[]>({ data: mockFloatingIps }))

      const user = userEvent.setup()
      render(<FloatingIps />, { wrapper: createWrapper() })

      const sortSelect = screen.getByTestId("sort-select")
      await user.click(sortSelect)
      await user.click(screen.getByText("Floating IP Address"))

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({
          sort_key: "floating_ip_address",
          sort_dir: "asc",
        })
      })
    })

    it("toggles sort direction", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.floatingIp.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<FloatingIp[]>({ data: mockFloatingIps }))

      const user = userEvent.setup()
      render(<FloatingIps />, { wrapper: createWrapper() })

      const directionToggle = screen.getByTestId("direction-toggle")
      await user.click(directionToggle)

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({
          sort_key: "fixed_ip_address",
          sort_dir: "desc",
        })
      })
    })
  })

  describe("Filter functionality", () => {
    it("applies status filter to query", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.floatingIp.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<FloatingIp[]>({ data: mockFloatingIps }))

      const user = userEvent.setup()
      render(<FloatingIps />, { wrapper: createWrapper() })

      const filterSelect = screen.getByTestId("select-filterValue")
      await user.click(filterSelect)
      await user.click(screen.getByTestId("status"))

      const combobox = screen.getByTestId("combobox-filterValue")
      await user.click(combobox.querySelector(".juno-combobox-toggle")!)
      await user.click(screen.getByTestId("ACTIVE"))

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({ status: "ACTIVE" })
      })
    })

    it("applies DOWN status filter", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.floatingIp.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<FloatingIp[]>({ data: mockFloatingIps }))

      const user = userEvent.setup()
      render(<FloatingIps />, { wrapper: createWrapper() })

      const filterSelect = screen.getByTestId("select-filterValue")
      await user.click(filterSelect)
      await user.click(screen.getByTestId("status"))

      const combobox = screen.getByTestId("combobox-filterValue")
      await user.click(combobox.querySelector(".juno-combobox-toggle")!)
      await user.click(screen.getByTestId("DOWN"))

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({ status: "DOWN" })
      })
    })
  })

  describe("Search functionality", () => {
    it("includes search term in query", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.floatingIp.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<FloatingIp[]>({ data: mockFloatingIps }))

      const user = userEvent.setup()
      render(<FloatingIps />, { wrapper: createWrapper() })

      const searchbox = screen.getByRole("searchbox")
      await user.type(searchbox, "203.0.113")

      const searchButton = screen.getByRole("button", { name: "Search" })
      await user.click(searchButton)

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({ searchTerm: "203.0.113" })
      })
    })

    it("excludes empty search term", () => {
      const mockUseQuery = vi.mocked(trpcReact.network.floatingIp.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<FloatingIp[]>({ data: mockFloatingIps }))

      render(<FloatingIps />, { wrapper: createWrapper() })

      const initialCall = mockUseQuery.mock.calls[0][0] as Record<string, unknown>
      expect("searchTerm" in initialCall).toBe(false)
    })
  })

  describe("Integration", () => {
    it("combines sort, filter, and search parameters", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.floatingIp.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<FloatingIp[]>({ data: mockFloatingIps }))

      const user = userEvent.setup()
      render(<FloatingIps />, { wrapper: createWrapper() })

      // Change sort
      const sortSelect = screen.getByTestId("sort-select")
      await user.click(sortSelect)

      // Wait for dropdown to appear and click the sort option (not the filter label)
      await waitFor(() => {
        const sortOptions = screen.getAllByText("Status")
        // First is in the sort dropdown, second is in the filter label
        return sortOptions.length > 1
      })
      const sortOptions = screen.getAllByText("Status")
      await user.click(sortOptions[sortOptions.length - 1])

      // Apply filter
      const filterSelect = screen.getByTestId("select-filterValue")
      await user.click(filterSelect)
      await user.click(screen.getByTestId("status"))

      const combobox = screen.getByTestId("combobox-filterValue")
      await user.click(combobox.querySelector(".juno-combobox-toggle")!)
      await user.click(screen.getByTestId("ACTIVE"))

      // Search
      const searchbox = screen.getByRole("searchbox")
      await user.type(searchbox, "203")
      const searchButton = screen.getByRole("button", { name: "Search" })
      await user.click(searchButton)

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({
          sort_key: "status",
          sort_dir: "asc",
          status: "ACTIVE",
          searchTerm: "203",
        })
      })
    })
  })
})
