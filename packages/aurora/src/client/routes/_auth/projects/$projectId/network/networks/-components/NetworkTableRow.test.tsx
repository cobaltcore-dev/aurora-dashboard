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
  project_id: "proj-1",
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
    it("renders the network name with its ID below", () => {
      renderComponent()

      expect(screen.getByText("private")).toBeInTheDocument()
      expect(screen.getByText("net-123")).toBeInTheDocument()
    })

    it("renders only the ID when the network has no name", () => {
      renderComponent({ ...mockNetwork, name: "" })

      expect(screen.getAllByText("net-123")).toHaveLength(1)
    })

    it("renders status, admin state, shared, external and MTU", () => {
      renderComponent()

      const [, status, adminState, , shared, external, mtu] = cells()
      expect(status).toHaveTextContent("ACTIVE")
      expect(adminState).toHaveTextContent("UP")
      expect(shared).toHaveTextContent("Yes")
      expect(external).toHaveTextContent("No")
      expect(mtu).toHaveTextContent("8950")
    })

    it("renders DOWN, unshared and external networks", () => {
      renderComponent({ ...mockNetwork, admin_state_up: false, shared: false, "router:external": true })

      const [, , adminState, , shared, external] = cells()
      expect(adminState).toHaveTextContent("DOWN")
      expect(shared).toHaveTextContent("No")
      expect(external).toHaveTextContent("Yes")
    })

    it("renders subnet names and falls back to the subnet ID", () => {
      renderComponent()

      const subnets = cells()[3]
      expect(subnets).toHaveTextContent("private-v4")
      expect(subnets).toHaveTextContent("subnet-v6")
      expect(subnets).not.toHaveTextContent("subnet-v4")
    })

    it("renders dashes for missing subnets, external flag and MTU", () => {
      renderComponent({ ...mockNetwork, subnets: [], subnet_details: [], "router:external": null, mtu: undefined })

      const [, , , subnets, , external, mtu] = cells()
      expect(subnets).toHaveTextContent("–")
      expect(external).toHaveTextContent("–")
      expect(mtu).toHaveTextContent("–")
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

      await user.click(screen.getByTestId("network-row-net-123").querySelector("button")!)
      await user.click(await screen.findByText("Show Details"))

      expect(mockNavigate).toHaveBeenCalledWith(expectedNavigation)
    })

    it("does not navigate when the menu button is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByTestId("network-row-net-123").querySelector("button")!)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("renders only read-only menu items", async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByTestId("network-row-net-123").querySelector("button")!)

      expect(await screen.findAllByRole("menuitem")).toHaveLength(1)
    })
  })
})
