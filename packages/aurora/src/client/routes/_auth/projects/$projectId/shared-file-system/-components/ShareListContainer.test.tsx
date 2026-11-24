import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { Share } from "@/server/SharedFileSystem/types/share"
import { ShareListContainer } from "./ShareListContainer"

// Mock router and hooks
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockShare: Share = {
  id: "share-1",
  name: "my-share",
  status: "available",
  share_proto: null,
  share_type_name: null,
  share_type: null,
  size: null,
  availability_zone: null,
  is_public: null,
  share_network_id: null,
  created_at: null,
  description: null,
  snapshot_id: null,
  share_group_id: null,
  project_id: null,
  updated_at: null,
  replication_type: null,
  has_replicas: null,
  snapshot_support: null,
  create_share_from_snapshot_support: null,
  revert_to_snapshot_support: null,
  mount_snapshot_support: null,
  metadata: {},
}

const renderComponent = (props: {
  shares?: Share[]
  isLoading?: boolean
  error?: { message: string; code?: string } | null
  isFiltered?: boolean
  onRetry?: () => void
}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ShareListContainer
          shares={props.shares ?? []}
          isLoading={props.isLoading ?? false}
          error={props.error ?? null}
          isFiltered={props.isFiltered ?? false}
          onRetry={props.onRetry ?? vi.fn()}
        />
      </PortalProvider>
    </I18nProvider>
  )

describe("ShareListContainer", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the 10 column headers in the correct order", () => {
    renderComponent({ shares: [] })

    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(10)
    expect(headers[0]).toHaveTextContent("Status")
    expect(headers[1]).toHaveTextContent("Name / ID")
    expect(headers[2]).toHaveTextContent("Protocol")
    expect(headers[3]).toHaveTextContent("Size (GiB)")
    expect(headers[4]).toHaveTextContent("Share Type")
    expect(headers[5]).toHaveTextContent("Availability Zone")
    expect(headers[6]).toHaveTextContent("Visibility")
    expect(headers[7]).toHaveTextContent("Share Network")
    expect(headers[8]).toHaveTextContent("Created")
    expect(headers[9]).toHaveTextContent("") // Actions column
  })

  it("renders a loading state", () => {
    renderComponent({ isLoading: true })

    expect(screen.getByText("Loading Shares...")).toBeInTheDocument()
  })

  it("renders an error state with Try Again button", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    renderComponent({
      error: { message: "Network error" },
      onRetry,
    })

    expect(screen.getByText("Failed to Load Shares")).toBeInTheDocument()
    expect(screen.getByText("Network error")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders UNAUTHORIZED error without Try Again button", () => {
    renderComponent({
      error: { message: "Unauthorized", code: "UNAUTHORIZED" },
    })

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Your session has expired. Sign in again to view shares.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders empty state when no shares and not filtered", () => {
    renderComponent({ shares: [], isFiltered: false })

    expect(screen.getByText("No Shares Found")).toBeInTheDocument()
    expect(screen.getByText("No shares in this project")).toBeInTheDocument()
  })

  it("renders filtered-empty state when no shares and filtered", () => {
    renderComponent({ shares: [], isFiltered: true })

    expect(screen.getByText("No Matching Shares")).toBeInTheDocument()
    expect(screen.getByText("No shares match your filters")).toBeInTheDocument()
  })

  it("renders share rows when data is provided", () => {
    renderComponent({ shares: [mockShare, { ...mockShare, id: "share-2", name: "another" }] })

    expect(screen.getByTestId("share-row-share-1")).toBeInTheDocument()
    expect(screen.getByTestId("share-row-share-2")).toBeInTheDocument()
  })
})
