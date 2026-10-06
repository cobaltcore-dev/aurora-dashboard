import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { RouterListItem } from "@/server/Network/types/router"
import { RouterTableRow } from "./RouterTableRow"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockRouter: RouterListItem = {
  id: "router-123",
  name: "edge-router",
  description: "Main edge router",
  status: "ACTIVE",
  admin_state_up: true,
  project_id: "proj-1",
  routes: [],
  external_gateway_info: {
    network_id: "ext-net-1",
    network_name: "FloatingIP-external-01",
    enable_snat: true,
    external_fixed_ips: [{ subnet_id: "ext-subnet-1", ip_address: "172.24.4.10", subnet_name: "FloatingIP-sap-01" }],
  },
  private_networks: [{ network_id: "net-1", network_name: "private-net" }],
}

const routerWithoutConnections: RouterListItem = {
  ...mockRouter,
  external_gateway_info: null,
  private_networks: [],
}

const renderComponent = (router: RouterListItem = mockRouter) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <RouterTableRow router={router} />
      </PortalProvider>
    </I18nProvider>
  )

describe("RouterTableRow", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders correct data-testid", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId("router-row-router-123")).toBeInTheDocument()
      })
    })

    it("renders the router name with its ID below", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("edge-router")).toBeInTheDocument()
      })
      expect(screen.getByText("router-123")).toBeInTheDocument()
    })

    it("renders only the ID when the router has no name", async () => {
      renderComponent({ ...mockRouter, name: "" })

      await waitFor(() => {
        expect(screen.getAllByText("router-123")).toHaveLength(1)
      })
    })

    it("does not render the project", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("edge-router")).toBeInTheDocument()
      })
      expect(screen.queryByText("proj-1")).not.toBeInTheDocument()
    })

    it("renders the status", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("ACTIVE")).toBeInTheDocument()
      })
    })
  })

  describe("External gateway columns", () => {
    it("renders the external network name without its ID", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("FloatingIP-external-01")).toBeInTheDocument()
      })
      expect(screen.queryByText("ext-net-1")).not.toBeInTheDocument()
    })

    it("falls back to the external network ID when the name is unknown", async () => {
      renderComponent({
        ...mockRouter,
        external_gateway_info: { ...mockRouter.external_gateway_info!, network_name: undefined },
      })

      await waitFor(() => {
        expect(screen.getAllByText("ext-net-1")).toHaveLength(1)
      })
    })

    it("renders the external IP with the subnet name and without the subnet ID", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("172.24.4.10")).toBeInTheDocument()
      })
      expect(screen.getByText("FloatingIP-sap-01")).toBeInTheDocument()
      expect(screen.queryByText("ext-subnet-1")).not.toBeInTheDocument()
    })

    it("renders only the external IP when the subnet name is unknown", async () => {
      renderComponent({
        ...mockRouter,
        external_gateway_info: {
          ...mockRouter.external_gateway_info!,
          external_fixed_ips: [{ subnet_id: "ext-subnet-1", ip_address: "172.24.4.10" }],
        },
      })

      await waitFor(() => {
        expect(screen.getByText("172.24.4.10")).toBeInTheDocument()
      })
      expect(screen.queryByText("ext-subnet-1")).not.toBeInTheDocument()
    })

    it("renders all external fixed IPs", async () => {
      renderComponent({
        ...mockRouter,
        external_gateway_info: {
          ...mockRouter.external_gateway_info!,
          external_fixed_ips: [
            { subnet_id: "ext-subnet-1", ip_address: "172.24.4.10" },
            { subnet_id: "ext-subnet-v6", ip_address: "2001:db8::10" },
          ],
        },
      })

      await waitFor(() => {
        expect(screen.getByText("172.24.4.10")).toBeInTheDocument()
      })
      expect(screen.getByText("2001:db8::10")).toBeInTheDocument()
    })
  })

  describe("Private network column", () => {
    it("renders the private network name without its ID", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("private-net")).toBeInTheDocument()
      })
      expect(screen.queryByText("net-1")).not.toBeInTheDocument()
    })

    it("renders all private networks", async () => {
      renderComponent({
        ...mockRouter,
        private_networks: [
          { network_id: "net-1", network_name: "private-net" },
          { network_id: "net-2", network_name: "backend-net" },
        ],
      })

      await waitFor(() => {
        expect(screen.getByText("private-net")).toBeInTheDocument()
      })
      expect(screen.getByText("backend-net")).toBeInTheDocument()
    })

    it("falls back to the private network ID when the name is unknown", async () => {
      renderComponent({ ...mockRouter, private_networks: [{ network_id: "net-1" }] })

      await waitFor(() => {
        expect(screen.getAllByText("net-1")).toHaveLength(1)
      })
    })
  })

  describe("Empty values", () => {
    it("renders a dash for external network, external subnet and private network when not set", async () => {
      renderComponent(routerWithoutConnections)

      await waitFor(() => {
        expect(screen.getAllByText("–")).toHaveLength(3)
      })
    })

    it("renders a dash for the private network when interfaces could not be resolved", async () => {
      renderComponent({ ...mockRouter, private_networks: undefined })

      await waitFor(() => {
        expect(screen.getAllByText("–")).toHaveLength(1)
      })
    })
  })

  describe("Navigation", () => {
    const expectedNavigation = {
      to: "/projects/$projectId/network/routers/$routerId",
      params: { projectId: "proj-1", routerId: "router-123" },
    }

    it("navigates to the details page when the row is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("edge-router")).toBeInTheDocument()
      })

      await user.click(screen.getByText("edge-router"))

      expect(mockNavigate).toHaveBeenCalledWith(expectedNavigation)
    })

    it("navigates to the details page when Show Details is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      const row = await screen.findByTestId("router-row-router-123")
      const menuButton = row.querySelector("button")
      expect(menuButton).toBeInTheDocument()

      await user.click(menuButton!)
      await user.click(await screen.findByText("Show Details"))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expectedNavigation)
      })
    })

    it("does not navigate when the menu button is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      const row = await screen.findByTestId("router-row-router-123")
      await user.click(row.querySelector("button")!)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("renders only read-only menu items", async () => {
      const user = userEvent.setup()
      renderComponent()

      const row = await screen.findByTestId("router-row-router-123")
      await user.click(row.querySelector("button")!)

      expect(await screen.findByText("Show Details")).toBeInTheDocument()
      expect(screen.getAllByRole("menuitem")).toHaveLength(1)
    })
  })
})
