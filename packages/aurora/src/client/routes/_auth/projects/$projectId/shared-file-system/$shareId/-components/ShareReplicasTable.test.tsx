import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { ShareReplica } from "@/server/SharedFileSystem/types/share"
import { ShareReplicasTable } from "./ShareReplicasTable"

const mockReplicaFull: ShareReplica = {
  id: "replica-123",
  status: "available",
  replica_state: "active",
  availability_zone: "az1",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: null,
  share_id: null,
}

const mockReplicaMinimal: ShareReplica = {
  id: "replica-456",
  status: null,
  replica_state: null,
  availability_zone: null,
  created_at: null,
  updated_at: null,
  share_id: null,
}

const renderComponent = (props: {
  replicas?: ShareReplica[]
  isLoading?: boolean
  error?: { message?: string; data?: { code?: string } | null } | null
  canList?: boolean
  onRetry?: () => void
}) =>
  render(
    <I18nProvider i18n={i18n}>
      <ShareReplicasTable
        replicas={props.replicas ?? []}
        isLoading={props.isLoading ?? false}
        error={props.error ?? null}
        canList={props.canList ?? true}
        onRetry={props.onRetry ?? vi.fn()}
      />
    </I18nProvider>
  )

describe("ShareReplicasTable", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the 5 column headers in the correct order", () => {
    renderComponent({ replicas: [] })

    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(5)
    expect(headers[0]).toHaveTextContent("ID")
    expect(headers[1]).toHaveTextContent("Replica State")
    expect(headers[2]).toHaveTextContent("Status")
    expect(headers[3]).toHaveTextContent("Availability Zone")
    expect(headers[4]).toHaveTextContent("Created")
  })

  it("renders a replica with all fields", () => {
    renderComponent({ replicas: [mockReplicaFull] })

    expect(screen.getByText("replica-123")).toBeInTheDocument()

    const cells = screen.getAllByRole("gridcell")
    expect(cells[1]).toHaveTextContent("Active") // replica state label
    expect(cells[2]).toHaveTextContent("available")
    expect(cells[3]).toHaveTextContent("az1")
    expect(cells[4]).toHaveTextContent("1/15/2024")
  })

  it("renders In Sync for in_sync replica state", () => {
    const replica = { ...mockReplicaFull, replica_state: "in_sync" }
    renderComponent({ replicas: [replica] })

    const cells = screen.getAllByRole("gridcell")
    expect(cells[1]).toHaveTextContent("In Sync")
  })

  it("renders Out of Sync for out_of_sync replica state", () => {
    const replica = { ...mockReplicaFull, replica_state: "out_of_sync" }
    renderComponent({ replicas: [replica] })

    const cells = screen.getAllByRole("gridcell")
    expect(cells[1]).toHaveTextContent("Out of Sync")
  })

  it("renders Error for error replica state", () => {
    const replica = { ...mockReplicaFull, replica_state: "error" }
    renderComponent({ replicas: [replica] })

    const cells = screen.getAllByRole("gridcell")
    expect(cells[1]).toHaveTextContent("Error")
  })

  it("falls back to StatusLabel for unknown replica state", () => {
    const replica = { ...mockReplicaFull, replica_state: "unknown_state" }
    renderComponent({ replicas: [replica] })

    const cells = screen.getAllByRole("gridcell")
    expect(cells[1]).toHaveTextContent("unknown_state")
  })

  it("renders - - for missing fields", () => {
    renderComponent({ replicas: [mockReplicaMinimal] })

    const cells = screen.getAllByRole("gridcell")
    expect(cells[1]).toHaveTextContent("- -") // replica state
    expect(cells[2]).toHaveTextContent("- -") // status
    expect(cells[3]).toHaveTextContent("- -") // availability zone
    expect(cells[4]).toHaveTextContent("- -") // created
  })

  it("sorts replicas by replica state rank with error first", () => {
    const replicas: ShareReplica[] = [
      { ...mockReplicaMinimal, id: "replica-1", replica_state: "active" },
      { ...mockReplicaMinimal, id: "replica-2", replica_state: "error" },
      { ...mockReplicaMinimal, id: "replica-3", replica_state: "in_sync" },
    ]

    renderComponent({ replicas })

    const cells = screen.getAllByRole("gridcell")
    // First data row should be error replica
    expect(cells[0]).toHaveTextContent("replica-2")
  })

  it("does not trigger navigation on row click", async () => {
    const mockNavigate = vi.fn()
    vi.mock("@tanstack/react-router", () => ({
      useNavigate: () => mockNavigate,
    }))

    const user = userEvent.setup()
    renderComponent({ replicas: [mockReplicaFull] })

    const rows = screen.getAllByRole("row").slice(1) // Skip header
    await user.click(rows[0])

    // Verify navigate was not called (rows are not clickable)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("renders loading state", () => {
    renderComponent({ isLoading: true })

    expect(screen.getByText("Loading Replicas...")).toBeInTheDocument()
  })

  it("renders empty state", () => {
    renderComponent({ replicas: [] })

    expect(screen.getByText("No Replicas for This Share")).toBeInTheDocument()
    expect(screen.getByText("This share has no replicas.")).toBeInTheDocument()
  })

  it("renders generic error with Try Again button", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    renderComponent({
      error: { message: "Network error" },
      onRetry,
    })

    expect(screen.getByText("Failed to Load Replicas")).toBeInTheDocument()
    expect(screen.getByText("The replicas could not be loaded.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders FORBIDDEN error from server", () => {
    renderComponent({
      error: { data: { code: "FORBIDDEN" } },
    })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.getByText("You don't have permission to view the replicas of this share.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders Access Denied when canList is false", () => {
    renderComponent({
      canList: false,
    })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.getByText("You don't have permission to view the replicas of this share.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders UNAUTHORIZED error without Try Again button", () => {
    renderComponent({
      error: { data: { code: "UNAUTHORIZED" } },
    })

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Your session has expired. Sign in again to view replicas.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })
})
