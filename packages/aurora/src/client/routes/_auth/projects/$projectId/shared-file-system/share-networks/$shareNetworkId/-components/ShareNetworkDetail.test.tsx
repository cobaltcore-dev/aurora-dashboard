import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TRPCClientError } from "@trpc/client"
import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import { trpcReact } from "@/client/trpcClient"
import { ShareNetworkDetail } from "./ShareNetworkDetail"

// Mocks
vi.mock("@/client/hooks/useSetBreadcrumb", () => ({
  useSetBreadcrumb: vi.fn(),
}))

vi.mock("@/client/components/ContentHeader/ContentHeader", () => ({
  ContentHeader: ({ title }: { title: string }) => <div data-testid="content-header">{title}</div>,
}))

vi.mock("./ShareNetworkDetailsView", () => ({
  ShareNetworkDetailsView: vi.fn(() => <div data-testid="details-view">Details View</div>),
}))

const mockShareNetwork: ShareNetwork = {
  id: "net-123",
  name: "My Network",
  created_at: "2024-01-15T10:30:00Z",
}

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    sharedFileSystem: {
      getShareNetworkById: {
        useQuery: vi.fn(),
      },
    },
  },
}))

describe("ShareNetworkDetail", () => {
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
            <ShareNetworkDetail
              projectId="proj-1"
              shareNetworkId="net-123"
              routeId="test-route"
              activeTab="subnets"
              onTabChange={vi.fn()}
            />
          </PortalProvider>
        </I18nProvider>
      </QueryClientProvider>
    )

  it("renders loading state", () => {
    vi.mocked(trpcReact.sharedFileSystem.getShareNetworkById.useQuery).mockReturnValue({
      data: undefined,
      status: "pending",
      error: null,
      refetch: vi.fn(),
    } as never)

    renderComponent()

    expect(screen.getByText("Loading Share Network Details...")).toBeInTheDocument()
  })

  it("sets breadcrumb with ID while loading", async () => {
    const useSetBreadcrumbMock = await import("@/client/hooks/useSetBreadcrumb")
    const useSetBreadcrumb = vi.mocked(useSetBreadcrumbMock.useSetBreadcrumb)
    vi.mocked(trpcReact.sharedFileSystem.getShareNetworkById.useQuery).mockReturnValue({
      data: undefined,
      status: "pending",
      error: null,
      refetch: vi.fn(),
    } as never)

    renderComponent()

    expect(useSetBreadcrumb).toHaveBeenCalledWith("test-route", "net-123")
  })

  it("sets breadcrumb with name on success", async () => {
    const useSetBreadcrumbMock = await import("@/client/hooks/useSetBreadcrumb")
    const useSetBreadcrumb = vi.mocked(useSetBreadcrumbMock.useSetBreadcrumb)
    vi.mocked(trpcReact.sharedFileSystem.getShareNetworkById.useQuery).mockReturnValue({
      data: mockShareNetwork,
      status: "success",
      error: null,
      refetch: vi.fn(),
    } as never)

    renderComponent()

    expect(useSetBreadcrumb).toHaveBeenCalledWith("test-route", "My Network")
  })

  it("renders header with name when network has name", () => {
    vi.mocked(trpcReact.sharedFileSystem.getShareNetworkById.useQuery).mockReturnValue({
      data: mockShareNetwork,
      status: "success",
      error: null,
      refetch: vi.fn(),
    } as never)

    renderComponent()

    expect(screen.getByTestId("content-header")).toHaveTextContent("My Network")
  })

  it("renders header with ID when network has no name", () => {
    const unnamedNetwork = { ...mockShareNetwork, name: undefined }
    vi.mocked(trpcReact.sharedFileSystem.getShareNetworkById.useQuery).mockReturnValue({
      data: unnamedNetwork,
      status: "success",
      error: null,
      refetch: vi.fn(),
    } as never)

    renderComponent()

    expect(screen.getByTestId("content-header")).toHaveTextContent("net-123")
  })

  it("renders NOT_FOUND error with Back to Share Networks", () => {
    const error = new TRPCClientError("Not found")
    // @ts-expect-error - mocking error.data
    error.data = { code: "NOT_FOUND" }
    vi.mocked(trpcReact.sharedFileSystem.getShareNetworkById.useQuery).mockReturnValue({
      data: undefined,
      status: "error",
      error: error as never,
      refetch: vi.fn(),
    } as never)

    renderComponent()

    expect(screen.getByText("Share Network Not Found")).toBeInTheDocument()
    expect(
      screen.getByText("This share network does not exist or is not accessible in this project.")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Back to Share Networks" })).toBeInTheDocument()
  })

  it("renders BAD_REQUEST error with Back to Share Networks", () => {
    const error = new TRPCClientError("Bad request")
    // @ts-expect-error - mocking error.data
    error.data = { code: "BAD_REQUEST" }
    vi.mocked(trpcReact.sharedFileSystem.getShareNetworkById.useQuery).mockReturnValue({
      data: undefined,
      status: "error",
      error: error as never,
      refetch: vi.fn(),
    } as never)

    renderComponent()

    expect(screen.getByText("Share Network Not Found")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Back to Share Networks" })).toBeInTheDocument()
  })

  it("renders FORBIDDEN error with Access Denied", () => {
    const error = new TRPCClientError("Forbidden")
    // @ts-expect-error - mocking error.data
    error.data = { code: "FORBIDDEN" }
    vi.mocked(trpcReact.sharedFileSystem.getShareNetworkById.useQuery).mockReturnValue({
      data: undefined,
      status: "error",
      error: error as never,
      refetch: vi.fn(),
    } as never)

    renderComponent()

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.getByText("You don't have permission to view this share network.")).toBeInTheDocument()
  })

  it("renders generic error with Try Again", async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    const error = new TRPCClientError("Network error")
    // @ts-expect-error - mocking error.data
    error.data = { code: "INTERNAL_SERVER_ERROR" }
    vi.mocked(trpcReact.sharedFileSystem.getShareNetworkById.useQuery).mockReturnValue({
      data: undefined,
      status: "error",
      error: error as never,
      refetch,
    } as never)

    renderComponent()

    expect(screen.getByText("Error Loading Share Network")).toBeInTheDocument()
    expect(screen.getByText("The share network could not be loaded. Try again.")).toBeInTheDocument()

    const tryAgainButton = screen.getByRole("button", { name: "Try Again" })
    await user.click(tryAgainButton)

    expect(refetch).toHaveBeenCalledOnce()
  })
})
