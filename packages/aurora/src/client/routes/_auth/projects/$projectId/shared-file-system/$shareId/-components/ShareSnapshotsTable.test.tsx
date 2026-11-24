import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { ShareSnapshot } from "@/server/SharedFileSystem/types/snapshot"
import { ShareSnapshotsTable } from "./ShareSnapshotsTable"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockSnapshotFull: ShareSnapshot = {
  id: "snapshot-123",
  name: "my-snapshot",
  status: "available",
  size: 50,
  created_at: "2024-01-15T10:30:00Z",
  updated_at: null,
  description: null,
  share_id: null,
  share_proto: null,
  share_size: null,
  project_id: null,
}

const mockSnapshotMinimal: ShareSnapshot = {
  id: "snapshot-456",
  name: null,
  status: null,
  size: null,
  created_at: null,
  updated_at: null,
  description: null,
  share_id: null,
  share_proto: null,
  share_size: null,
  project_id: null,
}

const renderComponent = (props: {
  snapshots?: ShareSnapshot[]
  isLoading?: boolean
  error?: { message?: string; data?: { code?: string } | null } | null
  canList?: boolean
  onRetry?: () => void
}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ShareSnapshotsTable
          snapshots={props.snapshots ?? []}
          isLoading={props.isLoading ?? false}
          error={props.error ?? null}
          canList={props.canList ?? true}
          onRetry={props.onRetry ?? vi.fn()}
        />
      </PortalProvider>
    </I18nProvider>
  )

describe("ShareSnapshotsTable", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the 5 column headers in the correct order", () => {
    renderComponent({ snapshots: [] })

    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(5)
    expect(headers[0]).toHaveTextContent("Name / ID")
    expect(headers[1]).toHaveTextContent("Status")
    expect(headers[2]).toHaveTextContent("Size (GiB)")
    expect(headers[3]).toHaveTextContent("Created")
    expect(headers[4]).toHaveTextContent("") // Actions column
  })

  it("renders a named snapshot with all fields", () => {
    renderComponent({ snapshots: [mockSnapshotFull] })

    const row = screen.getByTestId("share-snapshot-row-snapshot-123")
    expect(within(row).getByText("my-snapshot")).toBeInTheDocument()
    expect(within(row).getByText("snapshot-123")).toBeInTheDocument()

    const cells = within(row).getAllByRole("gridcell")
    expect(cells[1]).toHaveTextContent("available")
    expect(cells[2]).toHaveTextContent("50")
    expect(cells[3]).toHaveTextContent("1/15/2024")
  })

  it("renders only the ID when name is missing", () => {
    renderComponent({ snapshots: [mockSnapshotMinimal] })

    const row = screen.getByTestId("share-snapshot-row-snapshot-456")
    // ID appears once as the primary ClipboardText
    expect(within(row).getAllByText("snapshot-456")).toHaveLength(1)
  })

  it("renders - - for missing size and created fields", () => {
    renderComponent({ snapshots: [mockSnapshotMinimal] })

    const row = screen.getByTestId("share-snapshot-row-snapshot-456")
    const cells = within(row).getAllByRole("gridcell")
    expect(cells[1]).toHaveTextContent("- -") // status
    expect(cells[2]).toHaveTextContent("- -") // size
    expect(cells[3]).toHaveTextContent("- -") // created
  })

  it("navigates to snapshot detail on row click", async () => {
    const user = userEvent.setup()
    renderComponent({ snapshots: [mockSnapshotFull] })

    const row = screen.getByTestId("share-snapshot-row-snapshot-123")
    await user.click(row)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/shared-file-system/snapshots/$snapshotId",
      params: { projectId: "proj-1", snapshotId: "snapshot-123" },
    })
  })

  it("navigates to snapshot detail from Show Details menu item", async () => {
    const user = userEvent.setup()
    renderComponent({ snapshots: [mockSnapshotFull] })

    const row = screen.getByTestId("share-snapshot-row-snapshot-123")
    const menuToggle = within(row).getByRole("button", { name: /more/i })
    await user.click(menuToggle)

    const showDetailsItem = screen.getByRole("menuitem", { name: "Show Details" })
    await user.click(showDetailsItem)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/shared-file-system/snapshots/$snapshotId",
      params: { projectId: "proj-1", snapshotId: "snapshot-123" },
    })
  })

  it("sorts snapshots with error status first", () => {
    const snapshots: ShareSnapshot[] = [
      { ...mockSnapshotMinimal, id: "snap-1", status: "available", name: "Available snapshot" },
      { ...mockSnapshotMinimal, id: "snap-2", status: "error", name: "Error snapshot" },
      { ...mockSnapshotMinimal, id: "snap-3", status: "creating", name: "Creating snapshot" },
    ]

    renderComponent({ snapshots })

    const rows = screen.getAllByRole("row").slice(1) // Skip header row
    expect(rows[0]).toHaveAttribute("data-testid", "share-snapshot-row-snap-2")
    expect(rows[1]).toHaveAttribute("data-testid", "share-snapshot-row-snap-3")
    expect(rows[2]).toHaveAttribute("data-testid", "share-snapshot-row-snap-1")
  })

  it("renders loading state", () => {
    renderComponent({ isLoading: true })

    expect(screen.getByText("Loading Snapshots...")).toBeInTheDocument()
  })

  it("renders empty state", () => {
    renderComponent({ snapshots: [] })

    expect(screen.getByText("No Snapshots for This Share")).toBeInTheDocument()
    expect(screen.getByText("This share has no snapshots.")).toBeInTheDocument()
  })

  it("renders generic error with Try Again button", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    renderComponent({
      error: { message: "Network error" },
      onRetry,
    })

    expect(screen.getByText("Failed to Load Snapshots")).toBeInTheDocument()
    expect(screen.getByText("The snapshots could not be loaded.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders FORBIDDEN error from server", () => {
    renderComponent({
      error: { data: { code: "FORBIDDEN" } },
    })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.getByText("You don't have permission to view the snapshots of this share.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders Access Denied when canList is false", () => {
    renderComponent({
      canList: false,
    })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.getByText("You don't have permission to view the snapshots of this share.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders UNAUTHORIZED error without Try Again button", () => {
    renderComponent({
      error: { data: { code: "UNAUTHORIZED" } },
    })

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Your session has expired. Sign in again to view snapshots.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })
})
