import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { type ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { Share } from "@/server/SharedFileSystem/types/share"
import { ShareDetail, ShareLoadError } from "./ShareDetail"
import { DEFAULT_SHARE_DETAILS_TAB } from "./shareDetailUtils"

const { mockGetShareByIdQuery, mockSetBreadcrumb, mockNavigate } = vi.hoisted(() => ({
  mockGetShareByIdQuery: vi.fn(),
  mockSetBreadcrumb: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    sharedFileSystem: {
      getShareById: { useQuery: mockGetShareByIdQuery },
    },
  },
}))

vi.mock("@/client/hooks/useSetBreadcrumb", () => ({
  useSetBreadcrumb: mockSetBreadcrumb,
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ projectId: "proj-1" }),
}))

vi.mock("@/client/components/ContentHeader/ContentHeader", () => ({
  ContentHeader: ({ title }: { title: string; projectId: string }) => <h1>{title}</h1>,
}))

vi.mock("./ShareDetailsView", () => ({
  ShareDetailsView: () => <div data-testid="share-details-view">Details View</div>,
}))

const TestWrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

const mockShare: Share = {
  id: "share-123",
  name: "my-share",
  status: "available",
  share_proto: null,
  share_type_name: null,
  share_type: null,
  size: null,
  availability_zone: null,
  is_public: null,
  share_network_id: null,
  snapshot_id: null,
  share_group_id: null,
  description: null,
  created_at: null,
  updated_at: null,
  project_id: null,
  replication_type: null,
  has_replicas: null,
  snapshot_support: null,
  create_share_from_snapshot_support: null,
  revert_to_snapshot_support: null,
  mount_snapshot_support: null,
  metadata: null,
}

describe("ShareLoadError", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders NOT_FOUND error with Back to Shares button", async () => {
    const user = userEvent.setup()
    const error = { data: { code: "NOT_FOUND" } }
    const onRetry = vi.fn()

    render(<ShareLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Share Not Found")).toBeInTheDocument()
    expect(screen.getByText("This share does not exist or is not accessible in this project.")).toBeInTheDocument()

    const backButton = screen.getByRole("button", { name: "Back to Shares" })
    await user.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/shared-file-system",
      params: { projectId: "proj-1" },
    })

    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders BAD_REQUEST as NOT_FOUND", () => {
    const error = { data: { code: "BAD_REQUEST" } }
    const onRetry = vi.fn()

    render(<ShareLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Share Not Found")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders FORBIDDEN error without retry", () => {
    const error = { data: { code: "FORBIDDEN" } }
    const onRetry = vi.fn()

    render(<ShareLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.getByText("You don't have permission to view this share.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders UNAUTHORIZED error without retry", () => {
    const error = { data: { code: "UNAUTHORIZED" } }
    const onRetry = vi.fn()

    render(<ShareLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("The session has expired. Sign in again to continue.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders INTERNAL_SERVER_ERROR with Try Again button", async () => {
    const user = userEvent.setup()
    const error = { data: { code: "INTERNAL_SERVER_ERROR" } }
    const onRetry = vi.fn()

    render(<ShareLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Error Loading Share")).toBeInTheDocument()
    expect(screen.getByText("The share could not be loaded. Try again.")).toBeInTheDocument()

    const retryButton = screen.getByRole("button", { name: "Try Again" })
    await user.click(retryButton)

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders error without code as generic error", () => {
    const error = {}
    const onRetry = vi.fn()

    render(<ShareLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Error Loading Share")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument()
  })
})

describe("ShareDetail", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders loading state", () => {
    mockGetShareByIdQuery.mockReturnValue({
      data: undefined,
      status: "pending",
      error: null,
      refetch: vi.fn(),
    })

    render(
      <ShareDetail
        projectId="proj-1"
        shareId="share-123"
        routeId="test-route"
        activeTab={DEFAULT_SHARE_DETAILS_TAB}
        onTabChange={vi.fn()}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText("Loading Share Details...")).toBeInTheDocument()
  })

  it("sets breadcrumb with shareId while loading", () => {
    mockGetShareByIdQuery.mockReturnValue({
      data: undefined,
      status: "pending",
      error: null,
      refetch: vi.fn(),
    })

    render(
      <ShareDetail
        projectId="proj-1"
        shareId="share-123"
        routeId="test-route"
        activeTab={DEFAULT_SHARE_DETAILS_TAB}
        onTabChange={vi.fn()}
      />,
      { wrapper: TestWrapper }
    )

    expect(mockSetBreadcrumb).toHaveBeenCalledWith("test-route", "share-123")
  })

  it("renders error state and allows retry", async () => {
    const user = userEvent.setup()
    const mockRefetch = vi.fn()
    mockGetShareByIdQuery.mockReturnValue({
      data: undefined,
      status: "error",
      error: { data: { code: "INTERNAL_SERVER_ERROR" } },
      refetch: mockRefetch,
    })

    render(
      <ShareDetail
        projectId="proj-1"
        shareId="share-123"
        routeId="test-route"
        activeTab={DEFAULT_SHARE_DETAILS_TAB}
        onTabChange={vi.fn()}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText("Error Loading Share")).toBeInTheDocument()

    const retryButton = screen.getByRole("button", { name: "Try Again" })
    await user.click(retryButton)

    expect(mockRefetch).toHaveBeenCalledOnce()
  })

  it("renders success state with ContentHeader and ShareDetailsView", () => {
    mockGetShareByIdQuery.mockReturnValue({
      data: mockShare,
      status: "success",
      error: null,
      refetch: vi.fn(),
    })

    render(
      <ShareDetail
        projectId="proj-1"
        shareId="share-123"
        routeId="test-route"
        activeTab={DEFAULT_SHARE_DETAILS_TAB}
        onTabChange={vi.fn()}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole("heading", { name: "my-share" })).toBeInTheDocument()
    expect(screen.getByTestId("share-details-view")).toBeInTheDocument()
  })

  it("renders shareId as title when share has no name", () => {
    const shareWithoutName = { ...mockShare, name: null }
    mockGetShareByIdQuery.mockReturnValue({
      data: shareWithoutName,
      status: "success",
      error: null,
      refetch: vi.fn(),
    })

    render(
      <ShareDetail
        projectId="proj-1"
        shareId="share-123"
        routeId="test-route"
        activeTab={DEFAULT_SHARE_DETAILS_TAB}
        onTabChange={vi.fn()}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole("heading", { name: "share-123" })).toBeInTheDocument()
  })

  it("sets breadcrumb with share name on success", () => {
    mockGetShareByIdQuery.mockReturnValue({
      data: mockShare,
      status: "success",
      error: null,
      refetch: vi.fn(),
    })

    render(
      <ShareDetail
        projectId="proj-1"
        shareId="share-123"
        routeId="test-route"
        activeTab={DEFAULT_SHARE_DETAILS_TAB}
        onTabChange={vi.fn()}
      />,
      { wrapper: TestWrapper }
    )

    expect(mockSetBreadcrumb).toHaveBeenCalledWith("test-route", "my-share")
  })
})
