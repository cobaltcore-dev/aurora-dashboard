import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { NetworkListItem } from "@/server/Network/types/network"
import { NetworkTableRow } from "./NetworkTableRow"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockNetwork: NetworkListItem = {
  id: "net-123",
  name: "private",
  description: "App tier",
  status: "ACTIVE",
  admin_state_up: true,
  shared: true,
  subnets: ["subnet-v4", "subnet-v6"],
  subnet_details: [
    { id: "subnet-v4", name: "private-v4" },
    { id: "subnet-v6", name: undefined },
  ],
  mtu: 8950,
  "router:external": false,
  project_id: "proj-owner",
}

const renderComponent = (network: NetworkListItem = mockNetwork) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <NetworkTableRow network={network} />
      </PortalProvider>
    </I18nProvider>
  )

const cells = () => within(screen.getByTestId("network-row-net-123")).getAllByRole("gridcell")

describe("NetworkTableRow", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders the network name with its ID beneath", () => {
      renderComponent()

      expect(screen.getByText("private")).toBeInTheDocument()
      // ID is shown as ClipboardText (truncated to 13 chars: "net-123" is 7 chars, no truncation)
      expect(screen.getByText("net-123")).toBeInTheDocument()
    })

    it("shows a copy affordance for the network ID", () => {
      renderComponent()

      // ClipboardText renders a button with aria-label "Copy <id> to clipboard"
      expect(screen.getByRole("button", { name: /copy net-123 to clipboard/i })).toBeInTheDocument()
    })

    it("renders only the ID (with copy affordance) when the network has no name", () => {
      renderComponent({ ...mockNetwork, name: "" })

      // ID appears once: as the primary ClipboardText (no secondary line)
      expect(screen.getAllByText("net-123")).toHaveLength(1)
      expect(screen.getByRole("button", { name: /copy net-123 to clipboard/i })).toBeInTheDocument()
    })

    it("renders status, admin state, subnet count, external", () => {
      renderComponent()

      const [, status, adminState, subnets, , external] = cells()
      expect(status).toHaveTextContent("ACTIVE")
      expect(adminState).toHaveTextContent("UP")
      expect(subnets).toHaveTextContent("2")
      expect(external).toHaveTextContent("No")
    })

    it("shows the owning project_id with copy affordance when the network is shared (E2)", () => {
      renderComponent()

      // Shared cell: ClipboardText for project_id
      expect(screen.getByRole("button", { name: /copy proj-owner to clipboard/i })).toBeInTheDocument()
    })

    it("shows 'No' in the Shared column when the network is not shared", () => {
      renderComponent({ ...mockNetwork, shared: false })

      const [, , , , shared] = cells()
      expect(shared).toHaveTextContent("No")
      // No copy button for project_id in the shared cell
      expect(screen.queryByRole("button", { name: /copy proj-owner to clipboard/i })).not.toBeInTheDocument()
    })

    it("renders DOWN admin state and external=Yes", () => {
      renderComponent({ ...mockNetwork, admin_state_up: false, "router:external": true })

      const [, , adminState, , , external] = cells()
      expect(adminState).toHaveTextContent("DOWN")
      expect(external).toHaveTextContent("Yes")
    })

    it("renders the subnet count (not names)", () => {
      renderComponent()

      const subnets = cells()[3]
      expect(subnets).toHaveTextContent("2")
      // subnet names must not appear in the list row
      expect(subnets).not.toHaveTextContent("private-v4")
    })

    it("renders 0 subnets and dash for absent external flag", () => {
      renderComponent({ ...mockNetwork, subnets: [], subnet_details: [], "router:external": null })

      const [, , , subnets, , external] = cells()
      expect(subnets).toHaveTextContent("0")
      expect(external).toHaveTextContent("–")
    })

    it("does not render an MTU column", () => {
      renderComponent()

      // 7 cells total: Name, Status, Admin State, Subnets, Shared, External, overflow
      expect(cells()).toHaveLength(7)
    })
  })

  describe("Navigation", () => {
    const expectedNavigation = {
      to: "/projects/$projectId/network/networks/$networkId",
      params: { projectId: "proj-1", networkId: "net-123" },
    }

    it("navigates to the details page when the row is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByText("private"))

      expect(mockNavigate).toHaveBeenCalledWith(expectedNavigation)
    })

    it("navigates to the details page when Show Details is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      // The overflow menu button is the last button in the row (ClipboardText buttons precede it)
      const buttons = screen.getByTestId("network-row-net-123").querySelectorAll("button")
      await user.click(buttons[buttons.length - 1])
      await user.click(await screen.findByText("Show Details"))

      expect(mockNavigate).toHaveBeenCalledWith(expectedNavigation)
    })

    it("does not navigate when the overflow menu button is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      // The overflow menu button is the last button in the row; click the cell's button only
      const overflowCell = cells()[6]
      await user.click(overflowCell.querySelector("button")!)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("renders only read-only menu items", async () => {
      const user = userEvent.setup()
      renderComponent()

      const buttons = screen.getByTestId("network-row-net-123").querySelectorAll("button")
      await user.click(buttons[buttons.length - 1])

      expect(await screen.findAllByRole("menuitem")).toHaveLength(1)
    })
  })
})
