import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TRPCClientError } from "@trpc/client"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { trpcReact } from "@/client/trpcClient"
import { SecurityServicesList } from "./SecurityServicesList"

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
  }) as ReturnType<typeof trpcReact.sharedFileSystem.listSecurityServices.useQuery>

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      sharedFileSystem: {
        listSecurityServices: {
          useQuery: vi.fn(),
        },
      },
    },
  }
})

const mockSecurityServices: SecurityService[] = [
  {
    id: "sec-1",
    name: "LDAP Service",
    type: "ldap",
    status: "active",
    dns_ip: "10.0.0.1",
    server: "ldap.example.com",
    created_at: "2024-01-15T10:00:00Z",
    project_id: null,
    user: null,
    ou: null,
    domain: null,
    description: null,
    updated_at: null,
  },
  {
    id: "sec-2",
    name: "AD Service",
    type: "active_directory",
    status: "new",
    dns_ip: "10.0.0.2",
    server: "ad.example.com",
    created_at: "2024-01-14T10:00:00Z",
    project_id: null,
    user: null,
    ou: null,
    domain: null,
    description: null,
    updated_at: null,
  },
  {
    id: "sec-3",
    type: "custom",
    status: "active",
    dns_ip: null,
    server: null,
    created_at: null,
    project_id: null,
    user: null,
    ou: null,
    domain: null,
    description: null,
    updated_at: null,
  },
]

describe("SecurityServicesList", () => {
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
            <SecurityServicesList projectId="test-project" />
          </PortalProvider>
        </I18nProvider>
      </QueryClientProvider>
    )

  it("makes exactly one listSecurityServices call with project_id and no shareNetworkId", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    expect(trpcReact.sharedFileSystem.listSecurityServices.useQuery).toHaveBeenCalledWith(
      { project_id: "test-project" },
      { enabled: true, retry: false }
    )
    expect(trpcReact.sharedFileSystem.listSecurityServices.useQuery).toHaveBeenCalledOnce()
  })

  it("renders rows in name order by default", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    const rows = screen.getAllByRole("row").slice(1) // Skip header
    expect(rows[0]).toHaveAttribute("data-testid", "security-service-row-sec-2") // AD Service
    expect(rows[1]).toHaveAttribute("data-testid", "security-service-row-sec-1") // LDAP Service
    expect(rows[2]).toHaveAttribute("data-testid", "security-service-row-sec-3") // ID-only sorts last
  })

  it("filters by search term matching name", () => {
    mockSearchParams = { search: "LDAP" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    expect(screen.getByTestId("security-service-row-sec-1")).toBeInTheDocument()
    expect(screen.queryByTestId("security-service-row-sec-2")).not.toBeInTheDocument()
    expect(screen.getByText("1 of 3 security services")).toBeInTheDocument()
  })

  it("filters by search term matching ID", () => {
    mockSearchParams = { search: "sec-3" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    expect(screen.getByTestId("security-service-row-sec-3")).toBeInTheDocument()
    expect(screen.queryByTestId("security-service-row-sec-1")).not.toBeInTheDocument()
    expect(screen.getByText("1 of 3 security services")).toBeInTheDocument()
  })

  it("sorts by type ascending with missing values last", () => {
    mockSearchParams = { sortBy: "type", sortDirection: "asc" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    const rows = screen.getAllByRole("row").slice(1)
    // Alphabetical by label: Active Directory < custom < LDAP
    expect(rows[0]).toHaveAttribute("data-testid", "security-service-row-sec-2") // Active Directory
    expect(rows[1]).toHaveAttribute("data-testid", "security-service-row-sec-3") // custom (unknown, but not missing)
    expect(rows[2]).toHaveAttribute("data-testid", "security-service-row-sec-1") // LDAP
  })

  it("sorts by type descending with missing values last", () => {
    mockSearchParams = { sortBy: "type", sortDirection: "desc" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    const rows = screen.getAllByRole("row").slice(1)
    // Alphabetical descending by label: LDAP > custom > Active Directory
    expect(rows[0]).toHaveAttribute("data-testid", "security-service-row-sec-1") // LDAP
    expect(rows[1]).toHaveAttribute("data-testid", "security-service-row-sec-3") // custom (unknown, but not missing)
    expect(rows[2]).toHaveAttribute("data-testid", "security-service-row-sec-2") // Active Directory
  })

  it("sorts by created_at ascending with missing values last", () => {
    mockSearchParams = { sortBy: "created_at", sortDirection: "asc" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    const rows = screen.getAllByRole("row").slice(1)
    expect(rows[0]).toHaveAttribute("data-testid", "security-service-row-sec-2") // 2024-01-14
    expect(rows[1]).toHaveAttribute("data-testid", "security-service-row-sec-1") // 2024-01-15
    expect(rows[2]).toHaveAttribute("data-testid", "security-service-row-sec-3") // null, last
  })

  it("sorts by created_at descending with missing values last", () => {
    mockSearchParams = { sortBy: "created_at", sortDirection: "desc" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    const rows = screen.getAllByRole("row").slice(1)
    expect(rows[0]).toHaveAttribute("data-testid", "security-service-row-sec-1") // 2024-01-15
    expect(rows[1]).toHaveAttribute("data-testid", "security-service-row-sec-2") // 2024-01-14
    expect(rows[2]).toHaveAttribute("data-testid", "security-service-row-sec-3") // null, last
  })

  it("filters by type ldap", async () => {
    mockSearchParams = { type: "ldap" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    expect(screen.getByTestId("security-service-row-sec-1")).toBeInTheDocument()
    expect(screen.queryByTestId("security-service-row-sec-2")).not.toBeInTheDocument()
    expect(screen.queryByTestId("security-service-row-sec-3")).not.toBeInTheDocument()
  })

  it("filters by type other (unknown)", () => {
    mockSearchParams = { type: "other" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    expect(screen.queryByTestId("security-service-row-sec-1")).not.toBeInTheDocument()
    expect(screen.queryByTestId("security-service-row-sec-2")).not.toBeInTheDocument()
    expect(screen.getByTestId("security-service-row-sec-3")).toBeInTheDocument()
  })

  it("filters by type ldap correctly", () => {
    mockSearchParams = { type: "ldap" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    // Check that only the LDAP service is shown
    expect(screen.getByTestId("security-service-row-sec-1")).toBeInTheDocument()
    expect(screen.queryByTestId("security-service-row-sec-2")).not.toBeInTheDocument()
    expect(screen.queryByTestId("security-service-row-sec-3")).not.toBeInTheDocument()
  })

  it("shows Zone 3 with 3 security services when no filters", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    expect(screen.getByText("3 security services")).toBeInTheDocument()
    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
  })

  it("shows Zone 3 with 1 of 3 when filtered", () => {
    mockSearchParams = { type: "ldap" }
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityServices })
    )

    renderComponent()

    expect(screen.getByText("1 of 3 security services")).toBeInTheDocument()
  })

  it("hides Zone 3 while loading", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ isLoading: true })
    )

    renderComponent()

    expect(screen.queryByText(/\d+ security services/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument()
  })

  it("hides Zone 3 on error", () => {
    const error = new TRPCClientError("fail")
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ error: error as never })
    )

    renderComponent()

    expect(screen.queryByText(/\d+ security services/i)).not.toBeInTheDocument()
  })

  it("renders 403 as an info Message, not the grid", () => {
    const error = new TRPCClientError("forbidden")
    Object.defineProperty(error, "data", { value: { code: "FORBIDDEN" } })
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ error: error as never })
    )

    renderComponent()

    expect(screen.getByText("Insufficient Permissions")).toBeInTheDocument()
    expect(
      screen.getByText("You do not have the required permissions to view security services in this project.")
    ).toBeInTheDocument()
    expect(screen.queryByTestId("security-services-table")).not.toBeInTheDocument()
  })

  it("renders 401 and generic error states in the grid (smoke)", () => {
    const error = new TRPCClientError("unauthorized")
    Object.defineProperty(error, "data", { value: { code: "UNAUTHORIZED" } })
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue(
      createMockQueryResult({ error: error as never })
    )

    renderComponent()

    expect(screen.getByTestId("security-services-table")).toBeInTheDocument()
    expect(screen.getByText("Session Expired")).toBeInTheDocument()
  })
})
