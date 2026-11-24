import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import { ShareNetworkTableRow } from "./ShareNetworkTableRow"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockShareNetworkFull: ShareNetwork = {
  id: "net-123",
  name: "my-network",
  created_at: "2024-01-15T10:30:00Z",
  share_network_subnets: [{ id: "sub-1" }, { id: "sub-2" }],
}

const mockShareNetworkMinimal: ShareNetwork = {
  id: "net-456",
}

const renderComponent = (shareNetwork: ShareNetwork = mockShareNetworkFull) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ShareNetworkTableRow shareNetwork={shareNetwork} />
      </PortalProvider>
    </I18nProvider>
  )

const cells = (networkId: string) =>
  within(screen.getByTestId(`share-network-row-${networkId}`)).getAllByRole("gridcell")

describe("ShareNetworkTableRow", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders a network with name and ID", () => {
      renderComponent()

      expect(screen.getByText("my-network")).toBeInTheDocument()
      expect(screen.getByText("net-123")).toBeInTheDocument()
    })

    it("renders only the ID when name is missing", () => {
      renderComponent(mockShareNetworkMinimal)

      // ID appears once as the primary ClipboardText
      expect(screen.getAllByText("net-456")).toHaveLength(1)
      expect(screen.getByRole("button", { name: /copy net-456 to clipboard/i })).toBeInTheDocument()
    })

    it("renders subnet count as a number", () => {
      renderComponent()

      const [, subnetCount] = cells("net-123")
      expect(subnetCount).toHaveTextContent("2")
    })

    it("renders subnet count 0 for an empty array", () => {
      renderComponent({ ...mockShareNetworkFull, share_network_subnets: [] })

      const [, subnetCount] = cells("net-123")
      expect(subnetCount).toHaveTextContent("0")
    })

    it("renders - - for missing subnet count", () => {
      renderComponent(mockShareNetworkMinimal)

      const [, subnetCount] = cells("net-456")
      expect(subnetCount).toHaveTextContent("- -")
    })

    it("renders - - for null subnet array", () => {
      renderComponent({ ...mockShareNetworkFull, share_network_subnets: null })

      const [, subnetCount] = cells("net-123")
      expect(subnetCount).toHaveTextContent("- -")
    })

    it("renders created date", () => {
      renderComponent()

      const [, , created] = cells("net-123")
      expect(created).toHaveTextContent("1/15/2024")
    })

    it("renders - - for missing created_at", () => {
      renderComponent(mockShareNetworkMinimal)

      const [, , created] = cells("net-456")
      expect(created).toHaveTextContent("- -")
    })
  })

  describe("Navigation", () => {
    it("navigates to detail page on row click", async () => {
      const user = userEvent.setup()
      renderComponent()

      const row = screen.getByTestId("share-network-row-net-123")
      await user.click(row)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/share-networks/$shareNetworkId",
        params: { projectId: "proj-1", shareNetworkId: "net-123" },
      })
    })

    it("does not navigate when clicking the actions cell", async () => {
      const user = userEvent.setup()
      renderComponent()

      const [, , , actionsCell] = cells("net-123")
      await user.click(actionsCell)

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe("Overflow menu", () => {
    it("contains Show Details as the first and only item", async () => {
      const user = userEvent.setup()
      renderComponent()

      const menuButton = screen.getByRole("button", { name: /more/i })
      await user.click(menuButton)

      const menuItems = screen.getAllByRole("menuitem")
      expect(menuItems).toHaveLength(1)
      expect(menuItems[0]).toHaveTextContent("Show Details")
    })

    it("navigates to detail page when Show Details is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      const menuButton = screen.getByRole("button", { name: /more/i })
      await user.click(menuButton)

      const showDetailsItem = screen.getByRole("menuitem", { name: /show details/i })
      await user.click(showDetailsItem)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/share-networks/$shareNetworkId",
        params: { projectId: "proj-1", shareNetworkId: "net-123" },
      })
    })

    it("does not trigger row click when menu item is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      const menuButton = screen.getByRole("button", { name: /more/i })
      await user.click(menuButton)

      const showDetailsItem = screen.getByRole("menuitem", { name: /show details/i })
      await user.click(showDetailsItem)

      // Should be called exactly once from the menu item, not twice (menu + row)
      expect(mockNavigate).toHaveBeenCalledTimes(1)
    })
  })
})
