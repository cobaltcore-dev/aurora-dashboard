import { ReactElement } from "react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { FloatingIpTableRow } from "./FloatingIpTableRow"
import { FloatingIpActionModalTriggers } from "../-modals/FloatingIpActionModals"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "test-project",
}))

vi.mock("../-modals/FloatingIpActionModals", () => ({
  FloatingIpActionModals: ({ children }: { children: (triggers: FloatingIpActionModalTriggers) => ReactElement }) =>
    children({
      toggleEditModal: vi.fn(),
      toggleAttachModal: vi.fn(),
      toggleDetachModal: vi.fn(),
      toggleReleaseModal: vi.fn(),
    }),
}))

describe("FloatingIpTableRow", () => {
  const mockFloatingIp: FloatingIp = {
    id: "fip-123",
    floating_ip_address: "203.0.113.10",
    fixed_ip_address: "10.0.0.5",
    floating_network_id: "net-external",
    port_id: "port-1",
    router_id: "router-1",
    project_id: "proj-1",
    tenant_id: "proj-1",
    status: "ACTIVE",
    dns_domain: "example.com",
    dns_name: "fip-1",
    description: "Web server FIP",
    revision_number: 1,
    tags: [],
  }

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  beforeEach(() => {
    i18n.activate("en")
  })

  const renderComponent = () => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <FloatingIpTableRow floatingIp={mockFloatingIp} />
        </PortalProvider>
      </I18nProvider>
    )
  }

  describe("Rendering", () => {
    it("renders floating IP data in cells", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("203.0.113.10")).toBeInTheDocument()
      })

      expect(screen.getByText("10.0.0.5")).toBeInTheDocument()
      expect(screen.getByText("net-external")).toBeInTheDocument()
      expect(screen.getByText("Web server FIP")).toBeInTheDocument()
    })

    it("renders status icon and text in single cell", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument()
      })

      // Verify the row contains the status text
      const row = screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)
      expect(row.textContent).toContain("Active")
    })

    it("renders em dash when fixed IP is missing", async () => {
      const fipWithoutFixedIp = { ...mockFloatingIp, fixed_ip_address: null }
      render(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <FloatingIpTableRow floatingIp={fipWithoutFixedIp} />
          </PortalProvider>
        </I18nProvider>
      )

      await waitFor(() => {
        const cells = screen.getAllByText("—")
        expect(cells.length).toBeGreaterThan(0)
      })
    })

    it("renders em dash when description is missing", async () => {
      const fipWithoutDescription = { ...mockFloatingIp, description: null }
      render(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <FloatingIpTableRow floatingIp={fipWithoutDescription} />
          </PortalProvider>
        </I18nProvider>
      )

      await waitFor(() => {
        const cells = screen.getAllByText("—")
        expect(cells.length).toBeGreaterThan(0)
      })
    })

    it("renders correct data-testid", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)).toBeInTheDocument()
      })
    })

    it("renders different status values correctly", async () => {
      const testCases: Array<[typeof mockFloatingIp.status, string]> = [
        ["ACTIVE", "Active"],
        ["DOWN", "Down"],
        ["ERROR", "Error"],
      ]

      for (const [status, displayText] of testCases) {
        const { unmount } = render(
          <I18nProvider i18n={i18n}>
            <PortalProvider>
              <FloatingIpTableRow floatingIp={{ ...mockFloatingIp, status }} />
            </PortalProvider>
          </I18nProvider>
        )

        await waitFor(() => {
          expect(screen.getByText(displayText)).toBeInTheDocument()
        })

        unmount()
      }
    })
  })

  describe("Navigation", () => {
    it("navigates to details page when Preview is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("203.0.113.10")).toBeInTheDocument()
      })

      // Open the popup menu and click Preview
      const row = screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)
      const menuButton = row.querySelector("button")
      expect(menuButton).toBeInTheDocument()

      await user.click(menuButton!)

      await waitFor(() => {
        const previewItem = screen.getByText("Preview")
        expect(previewItem).toBeInTheDocument()
      })

      const previewItem = screen.getByText("Preview")
      await user.click(previewItem)

      // Verify navigation was called with correct parameters
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/projects/$projectId/network/floatingips/$floatingIpId",
          params: { projectId: "test-project", floatingIpId: "fip-123" },
        })
      })
    })

    it("renders menu items with correct labels", async () => {
      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("203.0.113.10")).toBeInTheDocument()
      })

      // Open the popup menu
      const row = screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)
      const menuButton = row.querySelector("button")
      expect(menuButton).toBeInTheDocument()

      await user.click(menuButton!)

      await waitFor(() => {
        expect(screen.getByText("Preview")).toBeInTheDocument()
        expect(screen.getByText("Edit Description")).toBeInTheDocument()
        expect(screen.getByText("Attach")).toBeInTheDocument()
        expect(screen.getByText("Detach")).toBeInTheDocument()
        expect(screen.getByText("Release")).toBeInTheDocument()
      })
    })
  })
})
