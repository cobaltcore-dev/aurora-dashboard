import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { Share } from "@/server/SharedFileSystem/types/share"
import { ShareTableRow } from "./ShareTableRow"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockShareFull: Share = {
  id: "share-123",
  name: "my-share",
  status: "available",
  share_proto: "NFS",
  share_type_name: "default",
  size: 100,
  availability_zone: "az1",
  is_public: false,
  share_network_id: "sharenet-456",
  created_at: "2024-01-15T10:30:00Z",
  description: null,
  share_type: null,
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

const mockShareMinimal: Share = {
  id: "share-456",
  name: null,
  status: null,
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

const renderComponent = (share: Share = mockShareFull) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ShareTableRow share={share} />
      </PortalProvider>
    </I18nProvider>
  )

const cells = (shareId: string) => within(screen.getByTestId(`share-row-${shareId}`)).getAllByRole("gridcell")

describe("ShareTableRow", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders a fully populated share with all fields", () => {
      renderComponent()

      const [status, , protocol, size, shareType, az, visibility, shareNetwork, created] = cells("share-123")

      // StatusLabel renders "available" (CSS first-letter:uppercase doesn't apply in jsdom)
      expect(status).toHaveTextContent("available")
      expect(screen.getByText("my-share")).toBeInTheDocument()
      expect(screen.getByText("share-123")).toBeInTheDocument()
      expect(protocol).toHaveTextContent("NFS")
      expect(size).toHaveTextContent("100")
      expect(shareType).toHaveTextContent("default")
      expect(az).toHaveTextContent("az1")
      expect(visibility).toHaveTextContent("Private")
      expect(shareNetwork).toHaveTextContent("sharenet-456")
      expect(created).toHaveTextContent("1/15/2024")
    })

    it("renders only the ID when name is missing", () => {
      renderComponent(mockShareMinimal)

      // ID appears once as the primary ClipboardText
      expect(screen.getAllByText("share-456")).toHaveLength(1)
      expect(screen.getByRole("button", { name: /copy share-456 to clipboard/i })).toBeInTheDocument()
    })

    it("renders - - for missing fields in an ID-only share", () => {
      renderComponent(mockShareMinimal)

      const [status, , protocol, size, shareType, az, visibility, shareNetwork, created] = cells("share-456")

      expect(status).toHaveTextContent("- -")
      expect(protocol).toHaveTextContent("- -")
      expect(size).toHaveTextContent("- -")
      expect(shareType).toHaveTextContent("- -")
      expect(az).toHaveTextContent("- -")
      expect(visibility).toHaveTextContent("- -")
      expect(shareNetwork).toHaveTextContent("- -")
      expect(created).toHaveTextContent("- -")
    })

    it("falls back to share_type UUID when share_type_name is missing", () => {
      renderComponent({ ...mockShareFull, share_type_name: null, share_type: "uuid-789" })

      const [, , , , shareType] = cells("share-123")
      expect(shareType).toHaveTextContent("uuid-789")
    })

    it("renders size 0 as 0", () => {
      renderComponent({ ...mockShareFull, size: 0 })

      const [, , , size] = cells("share-123")
      expect(size).toHaveTextContent("0")
    })

    it("renders Public visibility", () => {
      renderComponent({ ...mockShareFull, is_public: true })

      const [, , , , , , visibility] = cells("share-123")
      expect(visibility).toHaveTextContent("Public")
    })

    it("shows a copy affordance for the share ID", () => {
      renderComponent()

      expect(screen.getByRole("button", { name: /copy share-123 to clipboard/i })).toBeInTheDocument()
    })
  })

  describe("Navigation", () => {
    const expectedNavigation = {
      to: "/projects/$projectId/shared-file-system/$shareId",
      params: { projectId: "proj-1", shareId: "share-123" },
    }

    it("navigates to the details page when the row is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByText("my-share"))

      expect(mockNavigate).toHaveBeenCalledWith(expectedNavigation)
    })

    it("navigates to the details page when Show Details is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      // Open the overflow menu (last button in the row)
      const buttons = screen.getByTestId("share-row-share-123").querySelectorAll("button")
      await user.click(buttons[buttons.length - 1])
      await user.click(await screen.findByText("Show Details"))

      expect(mockNavigate).toHaveBeenCalledWith(expectedNavigation)
    })

    it("does not navigate when the overflow menu button is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      const overflowCell = cells("share-123")[9]
      await user.click(overflowCell.querySelector("button")!)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("does not navigate when clicking the clipboard copy button", async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole("button", { name: /copy share-123 to clipboard/i }))

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("renders exactly one menu item: Show Details", async () => {
      const user = userEvent.setup()
      renderComponent()

      const buttons = screen.getByTestId("share-row-share-123").querySelectorAll("button")
      await user.click(buttons[buttons.length - 1])

      const menuItems = await screen.findAllByRole("menuitem")
      expect(menuItems).toHaveLength(1)
      expect(menuItems[0]).toHaveTextContent("Show Details")
    })
  })
})
