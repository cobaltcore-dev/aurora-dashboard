import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import { ShareNetworkListContainer } from "./ShareNetworkListContainer"

// Mock router and hooks
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockShareNetwork: ShareNetwork = {
  id: "net-1",
  name: "my-network",
  created_at: "2024-01-15T10:30:00Z",
  share_network_subnets: [{ id: "sub-1" }],
}

const renderComponent = (props: {
  shareNetworks?: ShareNetwork[]
  isLoading?: boolean
  error?: { code?: string } | null
  isFiltered?: boolean
  onRetry?: () => void
}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ShareNetworkListContainer
          shareNetworks={props.shareNetworks ?? []}
          isLoading={props.isLoading ?? false}
          error={props.error ?? null}
          isFiltered={props.isFiltered ?? false}
          onRetry={props.onRetry ?? vi.fn()}
        />
      </PortalProvider>
    </I18nProvider>
  )

describe("ShareNetworkListContainer", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the 4 column headers in the correct order", () => {
    renderComponent({ shareNetworks: [] })

    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(4)
    expect(headers[0]).toHaveTextContent("Name / ID")
    expect(headers[1]).toHaveTextContent("Subnet Count")
    expect(headers[2]).toHaveTextContent("Created")
    expect(headers[3]).toHaveTextContent("") // Actions column
  })

  it("renders a loading state", () => {
    renderComponent({ isLoading: true })

    expect(screen.getByText("Loading Share Networks...")).toBeInTheDocument()
  })

  it("renders an error state with Try Again button", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    renderComponent({
      error: { code: "INTERNAL_SERVER_ERROR" },
      onRetry,
    })

    expect(screen.getByText("Failed to Load Share Networks")).toBeInTheDocument()
    expect(screen.getByText("The share networks could not be loaded.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders UNAUTHORIZED error without Try Again button", () => {
    renderComponent({
      error: { code: "UNAUTHORIZED" },
    })

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Your session has expired. Sign in again to view share networks.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders empty state when no networks and not filtered", () => {
    renderComponent({ shareNetworks: [], isFiltered: false })

    expect(screen.getByText("No Share Networks Found")).toBeInTheDocument()
    expect(screen.getByText("No share networks in this project")).toBeInTheDocument()
  })

  it("renders filtered-empty state when no networks and filtered", () => {
    renderComponent({ shareNetworks: [], isFiltered: true })

    expect(screen.getByText("No Matching Share Networks")).toBeInTheDocument()
    expect(screen.getByText("No share networks match your search")).toBeInTheDocument()
  })

  it("renders network rows when data is provided", () => {
    renderComponent({
      shareNetworks: [mockShareNetwork, { ...mockShareNetwork, id: "net-2", name: "another" }],
    })

    expect(screen.getByTestId("share-network-row-net-1")).toBeInTheDocument()
    expect(screen.getByTestId("share-network-row-net-2")).toBeInTheDocument()
  })
})
