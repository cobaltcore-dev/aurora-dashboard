import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TRPCClientError } from "@trpc/client"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { trpcReact } from "@/client/trpcClient"
import { SecurityServiceDetail } from "./SecurityServiceDetail"

const mockSetBreadcrumb = vi.fn()

vi.mock("@/client/hooks/useSetBreadcrumb", () => ({
  useSetBreadcrumb: vi.fn((routeId: string, label: string) => mockSetBreadcrumb(routeId, label)),
}))

type MockQueryResult<TData> = {
  data: TData | undefined
  status: "pending" | "error" | "success"
  error: TRPCClientError<never> | null
  refetch: () => Promise<unknown>
}

const createMockQueryResult = <TData,>(overrides: Partial<MockQueryResult<TData>> = {}) =>
  ({
    data: undefined,
    status: "success",
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as ReturnType<typeof trpcReact.sharedFileSystem.getSecurityServiceById.useQuery>

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      sharedFileSystem: {
        getSecurityServiceById: {
          useQuery: vi.fn(),
        },
      },
    },
  }
})

const mockSecurityService: SecurityService = {
  id: "sec-123",
  name: "LDAP Service",
  type: "ldap",
  status: "active",
  dns_ip: "10.0.0.1",
  server: "ldap.example.com",
  domain: "example.com",
  user: "admin",
  ou: "IT",
  description: "Company LDAP",
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-16T10:00:00Z",
  project_id: null,
}

describe("SecurityServiceDetail", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    i18n.activate("en")
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
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
            <SecurityServiceDetail projectId="proj-1" securityServiceId="sec-123" routeId="/test-route" />
          </PortalProvider>
        </I18nProvider>
      </QueryClientProvider>
    )

  it("sets breadcrumb to ID while loading", () => {
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ status: "pending" })
    )

    renderComponent()

    expect(mockSetBreadcrumb).toHaveBeenCalledWith("/test-route", "sec-123")
  })

  it("sets breadcrumb to name on success", () => {
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityService })
    )

    renderComponent()

    expect(mockSetBreadcrumb).toHaveBeenCalledWith("/test-route", "LDAP Service")
  })

  it("sets breadcrumb to ID for unnamed service", () => {
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ data: { ...mockSecurityService, name: null } })
    )

    renderComponent()

    expect(mockSetBreadcrumb).toHaveBeenCalledWith("/test-route", "sec-123")
  })

  it("renders loading state", () => {
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ status: "pending" })
    )

    renderComponent()

    expect(screen.getByText("Loading Security Service Details...")).toBeInTheDocument()
  })

  it("renders NOT_FOUND error with Back to Security Services", () => {
    const error = new TRPCClientError("not found")
    Object.defineProperty(error, "data", { value: { code: "NOT_FOUND" } })
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ status: "error", error: error as never })
    )

    renderComponent()

    expect(screen.getByText("Security Service Not Found")).toBeInTheDocument()
    expect(
      screen.getByText("This security service does not exist or is not accessible in this project.")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Back to Security Services" })).toBeInTheDocument()
  })

  it("renders BAD_REQUEST as not found", () => {
    const error = new TRPCClientError("bad request")
    Object.defineProperty(error, "data", { value: { code: "BAD_REQUEST" } })
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ status: "error", error: error as never })
    )

    renderComponent()

    expect(screen.getByText("Security Service Not Found")).toBeInTheDocument()
  })

  it("renders FORBIDDEN error with Access Denied", () => {
    const error = new TRPCClientError("forbidden")
    Object.defineProperty(error, "data", { value: { code: "FORBIDDEN" } })
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ status: "error", error: error as never })
    )

    renderComponent()

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.getByText("You don't have permission to view this security service.")).toBeInTheDocument()
  })

  it("renders UNAUTHORIZED error", () => {
    const error = new TRPCClientError("unauthorized")
    Object.defineProperty(error, "data", { value: { code: "UNAUTHORIZED" } })
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ status: "error", error: error as never })
    )

    renderComponent()

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
  })

  it("renders generic error with Try Again button that calls refetch", async () => {
    const user = userEvent.setup()
    const error = new TRPCClientError("internal error")
    Object.defineProperty(error, "data", { value: { code: "INTERNAL_SERVER_ERROR" } })
    const refetch = vi.fn().mockResolvedValue(undefined)
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ status: "error", error: error as never, refetch })
    )

    renderComponent()

    expect(screen.getByText("Error Loading Security Service")).toBeInTheDocument()
    expect(screen.getByText("The security service could not be loaded. Try again.")).toBeInTheDocument()

    const tryAgainButton = screen.getByRole("button", { name: "Try Again" })
    await user.click(tryAgainButton)

    expect(refetch).toHaveBeenCalledOnce()
  })

  it("renders the header with display name on success", () => {
    vi.mocked(trpcReact.sharedFileSystem.getSecurityServiceById.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockSecurityService })
    )

    renderComponent()

    expect(screen.getByRole("heading", { name: "LDAP Service" })).toBeInTheDocument()
  })
})
