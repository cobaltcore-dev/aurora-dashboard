import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { type ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { ShareSnapshot } from "@/server/SharedFileSystem/types/snapshot"
import { ShareSnapshotDetail, ShareSnapshotLoadError } from "./ShareSnapshotDetail"

const { mockGetSnapshotByIdQuery, mockSetBreadcrumb, mockNavigate } = vi.hoisted(() => ({
  mockGetSnapshotByIdQuery: vi.fn(),
  mockSetBreadcrumb: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    sharedFileSystem: {
      getSnapshotById: { useQuery: mockGetSnapshotByIdQuery },
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

vi.mock("./ShareSnapshotDetailsView", () => ({
  ShareSnapshotDetailsView: () => <div data-testid="share-snapshot-details-view">Details View</div>,
}))

const TestWrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

const mockSnapshot: ShareSnapshot = {
  id: "snap-123",
  name: "my-snapshot",
  status: "available",
  size: 10,
  share_proto: "nfs",
  description: null,
  created_at: null,
  share_id: null,
  updated_at: null,
  project_id: null,
  share_size: null,
}

describe("ShareSnapshotLoadError", () => {
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

    render(<ShareSnapshotLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Share Snapshot Not Found")).toBeInTheDocument()
    expect(
      screen.getByText("This share snapshot does not exist or is not accessible in this project.")
    ).toBeInTheDocument()

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

    render(<ShareSnapshotLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Share Snapshot Not Found")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders FORBIDDEN error without retry", () => {
    const error = { data: { code: "FORBIDDEN" } }
    const onRetry = vi.fn()

    render(<ShareSnapshotLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.getByText("You don't have permission to view this share snapshot.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders UNAUTHORIZED error without retry", () => {
    const error = { data: { code: "UNAUTHORIZED" } }
    const onRetry = vi.fn()

    render(<ShareSnapshotLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("The session has expired. Sign in again to continue.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders INTERNAL_SERVER_ERROR with Try Again button", async () => {
    const user = userEvent.setup()
    const error = { data: { code: "INTERNAL_SERVER_ERROR" } }
    const onRetry = vi.fn()

    render(<ShareSnapshotLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Error Loading Share Snapshot")).toBeInTheDocument()
    expect(screen.getByText("The share snapshot could not be loaded. Try again.")).toBeInTheDocument()

    const retryButton = screen.getByRole("button", { name: "Try Again" })
    await user.click(retryButton)

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders error without code as generic error", () => {
    const error = {}
    const onRetry = vi.fn()

    render(<ShareSnapshotLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.getByText("Error Loading Share Snapshot")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument()
  })

  it("does not render raw error.message", () => {
    const error = { message: "upstream boom", data: { code: "INTERNAL_SERVER_ERROR" } }
    const onRetry = vi.fn()

    render(<ShareSnapshotLoadError error={error} onRetry={onRetry} />, { wrapper: TestWrapper })

    expect(screen.queryByText("upstream boom")).not.toBeInTheDocument()
  })
})

describe("ShareSnapshotDetail", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders loading state", () => {
    mockGetSnapshotByIdQuery.mockReturnValue({
      data: undefined,
      status: "pending",
      error: null,
      refetch: vi.fn(),
    })

    render(<ShareSnapshotDetail projectId="proj-1" snapshotId="snap-123" routeId="test-route" />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByText("Loading Share Snapshot Details...")).toBeInTheDocument()
  })

  it("sets breadcrumb with snapshotId while loading", () => {
    mockGetSnapshotByIdQuery.mockReturnValue({
      data: undefined,
      status: "pending",
      error: null,
      refetch: vi.fn(),
    })

    render(<ShareSnapshotDetail projectId="proj-1" snapshotId="snap-123" routeId="test-route" />, {
      wrapper: TestWrapper,
    })

    expect(mockSetBreadcrumb).toHaveBeenCalledWith("test-route", "snap-123")
  })

  it("renders error state and allows retry", async () => {
    const user = userEvent.setup()
    const mockRefetch = vi.fn()
    mockGetSnapshotByIdQuery.mockReturnValue({
      data: undefined,
      status: "error",
      error: { data: { code: "INTERNAL_SERVER_ERROR" } },
      refetch: mockRefetch,
    })

    render(<ShareSnapshotDetail projectId="proj-1" snapshotId="snap-123" routeId="test-route" />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByText("Error Loading Share Snapshot")).toBeInTheDocument()

    const retryButton = screen.getByRole("button", { name: "Try Again" })
    await user.click(retryButton)

    expect(mockRefetch).toHaveBeenCalledOnce()
  })

  it("renders success state with ContentHeader and ShareSnapshotDetailsView", () => {
    mockGetSnapshotByIdQuery.mockReturnValue({
      data: mockSnapshot,
      status: "success",
      error: null,
      refetch: vi.fn(),
    })

    render(<ShareSnapshotDetail projectId="proj-1" snapshotId="snap-123" routeId="test-route" />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByRole("heading", { name: "my-snapshot" })).toBeInTheDocument()
    expect(screen.getByTestId("share-snapshot-details-view")).toBeInTheDocument()
  })

  it("renders snapshotId as title when snapshot has no name", () => {
    const snapshotWithoutName = { ...mockSnapshot, name: null }
    mockGetSnapshotByIdQuery.mockReturnValue({
      data: snapshotWithoutName,
      status: "success",
      error: null,
      refetch: vi.fn(),
    })

    render(<ShareSnapshotDetail projectId="proj-1" snapshotId="snap-123" routeId="test-route" />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByRole("heading", { name: "snap-123" })).toBeInTheDocument()
  })

  it("sets breadcrumb with snapshot name on success", () => {
    mockGetSnapshotByIdQuery.mockReturnValue({
      data: mockSnapshot,
      status: "success",
      error: null,
      refetch: vi.fn(),
    })

    render(<ShareSnapshotDetail projectId="proj-1" snapshotId="snap-123" routeId="test-route" />, {
      wrapper: TestWrapper,
    })

    expect(mockSetBreadcrumb).toHaveBeenCalledWith("test-route", "my-snapshot")
  })

  it("sets breadcrumb with snapshotId when snapshot has no name", () => {
    const snapshotWithoutName = { ...mockSnapshot, name: null }
    mockGetSnapshotByIdQuery.mockReturnValue({
      data: snapshotWithoutName,
      status: "success",
      error: null,
      refetch: vi.fn(),
    })

    render(<ShareSnapshotDetail projectId="proj-1" snapshotId="snap-123" routeId="test-route" />, {
      wrapper: TestWrapper,
    })

    expect(mockSetBreadcrumb).toHaveBeenCalledWith("test-route", "snap-123")
  })

  it("calls getSnapshotById with correct arguments and retry: false", () => {
    mockGetSnapshotByIdQuery.mockReturnValue({
      data: mockSnapshot,
      status: "success",
      error: null,
      refetch: vi.fn(),
    })

    render(<ShareSnapshotDetail projectId="proj-1" snapshotId="snap-123" routeId="test-route" />, {
      wrapper: TestWrapper,
    })

    expect(mockGetSnapshotByIdQuery).toHaveBeenCalledWith(
      { project_id: "proj-1", snapshotId: "snap-123" },
      { retry: false }
    )
  })
})
