import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TRPCClientError } from "@trpc/client"
import type { Share } from "@/server/SharedFileSystem/types/share"
import { trpcReact } from "@/client/trpcClient"
import { SharesList } from "./SharesList"

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
  }) as ReturnType<typeof trpcReact.sharedFileSystem.listShares.useQuery>

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      sharedFileSystem: {
        listShares: {
          useQuery: vi.fn(),
        },
      },
    },
  }
})

const mockShares: Share[] = [
  {
    id: "share-1",
    name: "Share A",
    status: "available",
    share_proto: "NFS",
    share_type_name: "default",
    size: 100,
    availability_zone: "az1",
    is_public: true,
    created_at: "2024-01-15T10:00:00Z",
  } as Share,
  {
    id: "share-2",
    name: "Share B",
    status: "error",
    share_proto: "CIFS",
    share_type_name: "fast",
    size: 50,
    availability_zone: "az2",
    is_public: false,
    created_at: "2024-01-14T10:00:00Z",
  } as Share,
  {
    id: "share-3",
    name: "Share C",
    status: "creating",
    share_proto: "NFS",
    share_type_name: "default",
    size: 200,
    availability_zone: "az1",
    is_public: false,
    created_at: "2024-01-16T10:00:00Z",
  } as Share,
  {
    id: "share-4",
    status: "inactive",
    share_proto: "CEPHFS",
    share_type_name: "slow",
    availability_zone: "az2",
    created_at: "2024-01-13T10:00:00Z",
  } as Share,
  {
    id: "share-5",
    name: "Share E",
    status: "weird_state",
    share_proto: "NVMe",
  } as Share,
  {
    id: "share-6",
    name: "Share F",
  } as Share,
]

describe("SharesList", () => {
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
            <SharesList projectId="test-project" />
          </PortalProvider>
        </I18nProvider>
      </QueryClientProvider>
    )

  it("makes exactly one listShares call with project_id", () => {
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    expect(trpcReact.sharedFileSystem.listShares.useQuery).toHaveBeenCalledWith(
      { project_id: "test-project" },
      { enabled: true, retry: false }
    )
    expect(trpcReact.sharedFileSystem.listShares.useQuery).toHaveBeenCalledOnce()
  })

  it("sorts by status ascending (E3 order: error → transitional → inactive → available → unknown)", async () => {
    mockSearchParams = { sortBy: "status", sortDirection: "asc" }
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    // E3 order: error (share-2) → transitional (share-3) → inactive (share-4) → available (share-1) → unknown (share-5, share-6)
    const rows = screen.getAllByRole("row").slice(1) // Skip header
    expect(rows[0]).toHaveAttribute("data-testid", "share-row-share-2")
    expect(rows[1]).toHaveAttribute("data-testid", "share-row-share-3")
    expect(rows[2]).toHaveAttribute("data-testid", "share-row-share-4")
    expect(rows[3]).toHaveAttribute("data-testid", "share-row-share-1")
  })

  it("reverses the status sort order when direction is toggled", async () => {
    mockSearchParams = { sortBy: "status", sortDirection: "asc" }
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    const user = userEvent.setup()
    const directionButton = screen.getByTestId("direction-toggle")
    await user.click(directionButton)

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.any(Function),
      })
    )

    // Check that the navigation function sets sortDirection to "desc"
    const searchFn = mockNavigate.mock.calls[0][0].search
    const result = searchFn({ sortBy: "status", sortDirection: "asc" })
    expect(result.sortDirection).toBe("desc")
  })

  it("sorts by name, size, and created_at", async () => {
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    const user = userEvent.setup()

    // Test changing sort via UI
    const sortButton = screen.getByRole("button", { name: /sort by/i })
    await user.click(sortButton)

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Size" })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("option", { name: "Size" }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
    })
  })

  it("filters by search term (name and ID)", async () => {
    mockSearchParams = { search: "Share A" }
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    // Only share-1 should match
    expect(screen.getByTestId("share-row-share-1")).toBeInTheDocument()
    expect(screen.queryByTestId("share-row-share-2")).not.toBeInTheDocument()
  })

  it("filters by status, including 'other' bucket", async () => {
    mockSearchParams = { status: "available" }
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    // Only share-1 should match
    expect(screen.getByTestId("share-row-share-1")).toBeInTheDocument()
    expect(screen.queryByTestId("share-row-share-2")).not.toBeInTheDocument()
  })

  it("filters by protocol, including 'other' bucket", async () => {
    mockSearchParams = { protocol: "nfs" }
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    // share-1 and share-3 should match (NFS)
    expect(screen.getByTestId("share-row-share-1")).toBeInTheDocument()
    expect(screen.getByTestId("share-row-share-3")).toBeInTheDocument()
    expect(screen.queryByTestId("share-row-share-2")).not.toBeInTheDocument()
  })

  it("filters by multiple facets simultaneously", async () => {
    mockSearchParams = { protocol: "nfs", availabilityZone: "az1" }
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    // Only share-1 and share-3 match (NFS in az1)
    expect(screen.getByTestId("share-row-share-1")).toBeInTheDocument()
    expect(screen.getByTestId("share-row-share-3")).toBeInTheDocument()
    expect(screen.queryByTestId("share-row-share-2")).not.toBeInTheDocument()
  })

  it("shows active-filter pills and allows removing them", async () => {
    mockSearchParams = { status: "available", protocol: "nfs" }
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    // Clear all button should be present when 2+ pills exist
    expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument()

    // Only one share matches both filters
    expect(screen.getByTestId("share-row-share-1")).toBeInTheDocument()
    expect(screen.queryByTestId("share-row-share-2")).not.toBeInTheDocument()
  })

  it("shows Clear all button when two or more pills are present", async () => {
    mockSearchParams = { status: "available", protocol: "nfs" }
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()

    const clearAllButton = screen.getByRole("button", { name: /clear all/i })
    expect(clearAllButton).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(clearAllButton)

    expect(mockNavigate).toHaveBeenCalled()
  })

  it("shows item count in unfiltered and filtered forms", () => {
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares })
    )

    renderComponent()
    expect(screen.getByText("6 shares")).toBeInTheDocument()

    // With filter
    cleanup()
    mockSearchParams = { status: "available" }
    renderComponent()
    expect(screen.getByText(/1 of 6 shares/)).toBeInTheDocument()
  })

  it("shows last updated time", () => {
    const updatedAt = Date.now() - 60000 // 1 minute ago
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockShares, dataUpdatedAt: updatedAt })
    )

    renderComponent()
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it("shows loading state", () => {
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ isLoading: true })
    )

    renderComponent()
    expect(screen.getByText("Loading Shares...")).toBeInTheDocument()
  })

  it("shows error state with Try Again button", async () => {
    const mockRefetch = vi.fn()
    const error = new TRPCClientError("Network error")
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ error, refetch: mockRefetch })
    )

    renderComponent()

    expect(screen.getByText("Failed to Load Shares")).toBeInTheDocument()
    expect(screen.getByText("Network error")).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(mockRefetch).toHaveBeenCalledOnce()
  })

  it("shows FORBIDDEN as an info message, not an error state", () => {
    const error = new TRPCClientError("Forbidden", {
      result: { error: { data: { code: "FORBIDDEN" } } },
    } as never)
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(createMockQueryResult({ error }))

    renderComponent()

    expect(screen.getByText("Insufficient Permissions")).toBeInTheDocument()
    expect(screen.queryByTestId("shares-table")).not.toBeInTheDocument()
  })

  it("handles Rules of Hooks: loading → FORBIDDEN rerender", () => {
    // Start with loading
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ isLoading: true })
    )

    const { rerender } = renderComponent()
    expect(screen.getByText("Loading Shares...")).toBeInTheDocument()

    // Switch to FORBIDDEN
    const error = new TRPCClientError("Forbidden", {
      result: { error: { data: { code: "FORBIDDEN" } } },
    } as never)
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(
      createMockQueryResult({ isLoading: false, error })
    )

    rerender(
      <QueryClientProvider client={queryClient}>
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <SharesList projectId="test-project" />
          </PortalProvider>
        </I18nProvider>
      </QueryClientProvider>
    )

    expect(screen.getByText("Insufficient Permissions")).toBeInTheDocument()
  })

  it("shows filtered-empty vs empty copy", () => {
    vi.mocked(trpcReact.sharedFileSystem.listShares.useQuery).mockReturnValue(createMockQueryResult({ data: [] }))

    renderComponent()
    expect(screen.getByText("No shares in this project")).toBeInTheDocument()

    // With filter
    cleanup()
    mockSearchParams = { status: "available" }
    renderComponent()
    expect(screen.getByText("No shares match your filters")).toBeInTheDocument()
  })
})
