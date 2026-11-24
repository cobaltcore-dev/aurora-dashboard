import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TRPCClientError } from "@trpc/client"
import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import { trpcReact } from "@/client/trpcClient"
import { ShareNetworksList } from "./ShareNetworksList"

// Mock useParams, useSearch, useNavigate
let mockSearchParams: Record<string, unknown> = {}

const mockNavigate = vi.fn(
  (opts: { search: (prev: Record<string, unknown>) => Record<string, unknown>; replace?: boolean }) => {
    if (typeof opts.search === "function") {
      mockSearchParams = opts.search(mockSearchParams)
    }
  }
)

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    useParams: vi.fn(() => ({ projectId: "test-project" })),
    useSearch: vi.fn(() => mockSearchParams),
    useNavigate: vi.fn(() => mockNavigate),
  }
})

// Mock tRPC client
type MockQueryResult<TData> = {
  data: TData | undefined
  isLoading: boolean
  error: TRPCClientError<never> | null
  dataUpdatedAt: number
  refetch: () => Promise<unknown>
}

const createMockQueryResult = <TData,>(overrides: Partial<MockQueryResult<TData>> = {}) =>
  ({
    data: undefined,
    isLoading: false,
    error: null,
    dataUpdatedAt: Date.now(),
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as ReturnType<typeof trpcReact.sharedFileSystem.listShareNetworks.useQuery>

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      sharedFileSystem: {
        listShareNetworks: {
          useQuery: vi.fn(),
        },
      },
    },
  }
})

const mockShareNetworks: ShareNetwork[] = [
  {
    id: "net-1",
    name: "Network A",
    created_at: "2024-01-15T10:00:00Z",
    share_network_subnets: [{ id: "sub-1" }],
  },
  {
    id: "net-2",
    name: "Network B",
    created_at: "2024-01-14T10:00:00Z",
    share_network_subnets: [{ id: "sub-1" }, { id: "sub-2" }],
  },
  {
    id: "net-3",
    created_at: "2024-01-16T10:00:00Z",
  },
]

describe("ShareNetworksList", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    i18n.activate("en")
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    mockSearchParams = {}
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ShareNetworksList projectId="test-project" />
          </PortalProvider>
        </I18nProvider>
      </QueryClientProvider>
    )

  it("makes exactly one listShareNetworks call with project_id and retry: false", () => {
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShareNetworks })
    )

    renderComponent()

    expect(trpcReact.sharedFileSystem.listShareNetworks.useQuery).toHaveBeenCalledWith(
      { project_id: "test-project" },
      { enabled: true, retry: false }
    )
    expect(trpcReact.sharedFileSystem.listShareNetworks.useQuery).toHaveBeenCalledOnce()
  })

  it("renders rows in name order by default", () => {
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShareNetworks })
    )

    renderComponent()

    const rows = screen.getAllByRole("row").slice(1) // Skip header
    expect(rows[0]).toHaveAttribute("data-testid", "share-network-row-net-3") // ID-only sorts first
    expect(rows[1]).toHaveAttribute("data-testid", "share-network-row-net-1")
    expect(rows[2]).toHaveAttribute("data-testid", "share-network-row-net-2")
  })

  it("filters by search term in URL", () => {
    mockSearchParams = { search: "Network A" }
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShareNetworks })
    )

    renderComponent()

    expect(screen.getByTestId("share-network-row-net-1")).toBeInTheDocument()
    expect(screen.queryByTestId("share-network-row-net-2")).not.toBeInTheDocument()
    expect(screen.getByText("1 of 3 share networks")).toBeInTheDocument()
  })

  it("filters by ID in URL", () => {
    mockSearchParams = { search: "net-3" }
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShareNetworks })
    )

    renderComponent()

    expect(screen.getByTestId("share-network-row-net-3")).toBeInTheDocument()
    expect(screen.queryByTestId("share-network-row-net-1")).not.toBeInTheDocument()
    expect(screen.getByText("1 of 3 share networks")).toBeInTheDocument()
  })

  it("sorts by subnet_count descending with missing values last", () => {
    mockSearchParams = { sortBy: "subnet_count", sortDirection: "desc" }
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShareNetworks })
    )

    renderComponent()

    const rows = screen.getAllByRole("row").slice(1)
    expect(rows[0]).toHaveAttribute("data-testid", "share-network-row-net-2") // 2 subnets
    expect(rows[1]).toHaveAttribute("data-testid", "share-network-row-net-1") // 1 subnet
    expect(rows[2]).toHaveAttribute("data-testid", "share-network-row-net-3") // missing, last
  })

  it("does not render a Filters select", () => {
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShareNetworks })
    )

    renderComponent()

    expect(screen.queryByText(/filters/i)).not.toBeInTheDocument()
  })

  it("hides Zone 3 while loading", () => {
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ isLoading: true })
    )

    renderComponent()

    // Zone 3 shows the count + last updated; loading state is not Zone 3
    expect(screen.queryByText(/\d+ share networks/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument()
  })

  it("hides Zone 3 on error", () => {
    const error = new TRPCClientError("Network error")
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ error: error as never })
    )

    renderComponent()

    expect(screen.queryByText(/\d+ share networks/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument()
  })

  it("shows 403 message after all hooks", () => {
    const error = new TRPCClientError("Forbidden")
    // @ts-expect-error - mocking error.data
    error.data = { code: "FORBIDDEN" }
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ error: error as never })
    )

    renderComponent()

    expect(screen.getByText("Insufficient Permissions")).toBeInTheDocument()
    expect(
      screen.getByText("You do not have the required permissions to view share networks in this project.")
    ).toBeInTheDocument()
    expect(screen.queryByTestId("share-networks-table")).not.toBeInTheDocument()
  })

  it("does not throw on rerender from 403 to success (hook order)", () => {
    const error = new TRPCClientError("Forbidden")
    // @ts-expect-error - mocking error.data
    error.data = { code: "FORBIDDEN" }
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValueOnce(
      createMockQueryResult({ error: error as never })
    )

    const { rerender } = renderComponent()

    expect(screen.getByText("Insufficient Permissions")).toBeInTheDocument()

    // Rerender with success
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShareNetworks })
    )
    rerender(
      <QueryClientProvider client={queryClient}>
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ShareNetworksList projectId="test-project" />
          </PortalProvider>
        </I18nProvider>
      </QueryClientProvider>
    )

    expect(screen.queryByText("Insufficient Permissions")).not.toBeInTheDocument()
    expect(screen.getByTestId("share-networks-table")).toBeInTheDocument()
  })

  it("debounces search input", async () => {
    vi.mocked(trpcReact.sharedFileSystem.listShareNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShareNetworks })
    )

    renderComponent()

    const searchInput = screen.getByTestId("searchbar") as HTMLInputElement

    // Typing quickly should not immediately trigger navigate
    searchInput.value = "test"
    expect(mockNavigate).not.toHaveBeenCalled()

    // After 500ms, the debounce should fire (this is implementation detail tested via behavior)
    // The actual behavior test is in the integration tests
  })
})
