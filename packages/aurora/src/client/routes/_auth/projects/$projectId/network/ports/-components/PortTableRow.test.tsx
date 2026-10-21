import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { PortListItem } from "@/server/Network/types/port"
import { PortTableRow } from "./PortTableRow"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockPort: PortListItem = {
  id: "port-123",
  name: "db-port",
  description: "Reserved for the DB VM",
  network_id: "net-1",
  network_name: "dualstack-test",
  mac_address: "fa:16:3e:50:a2:79",
  admin_state_up: true,
  status: "DOWN",
  device_id: "server-1",
  device_owner: "compute:qa-de-1b",
  fixed_ips: [
    { subnet_id: "subnet-v4", ip_address: "10.180.242.42", ip_version: 4, subnet_name: "dualstack-v4" },
    { subnet_id: "subnet-v6", ip_address: "fd00:1234:feed:cafe::328", ip_version: 6, subnet_name: "dualstack-v6" },
  ],
  security_groups: ["sg-default"],
  allowed_address_pairs: [],
  project_id: "proj-1",
}

const unattachedPort: PortListItem = {
  ...mockPort,
  name: "",
  description: "",
  device_id: "",
  device_owner: "",
  fixed_ips: [],
}

const renderComponent = (port: PortListItem = mockPort, showNetwork?: boolean) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <PortTableRow port={port} showNetwork={showNetwork} />
      </PortalProvider>
    </I18nProvider>
  )

describe("PortTableRow", () => {
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
        expect(screen.getByTestId("port-row-port-123")).toBeInTheDocument()
      })
    })

    it("renders the port name with its ID below", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("db-port")).toBeInTheDocument()
      })
      expect(screen.getByText("port-123")).toBeInTheDocument()
    })

    it("renders only the ID when the port has no name", async () => {
      renderComponent({ ...mockPort, name: "" })

      await waitFor(() => {
        expect(screen.getAllByText("port-123")).toHaveLength(1)
      })
    })

    it("renders the description", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("Reserved for the DB VM")).toBeInTheDocument()
      })
    })

    it("renders the status", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("DOWN")).toBeInTheDocument()
      })
    })

    it("does not render the project or the MAC address", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("db-port")).toBeInTheDocument()
      })
      expect(screen.queryByText("proj-1")).not.toBeInTheDocument()
      expect(screen.queryByText("fa:16:3e:50:a2:79")).not.toBeInTheDocument()
    })
  })

  describe("Network column", () => {
    it("renders the network name without its ID", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("dualstack-test")).toBeInTheDocument()
      })
      expect(screen.queryByText("net-1")).not.toBeInTheDocument()
    })

    it("falls back to the network ID when the name is unknown", async () => {
      renderComponent({ ...mockPort, network_name: undefined })

      await waitFor(() => {
        expect(screen.getByText("net-1")).toBeInTheDocument()
      })
    })

    it("is not rendered when the list is scoped to a network", async () => {
      renderComponent(mockPort, false)

      await waitFor(() => {
        expect(screen.getByText("db-port")).toBeInTheDocument()
      })
      expect(screen.queryByText("dualstack-test")).not.toBeInTheDocument()
      expect(screen.getAllByRole("gridcell")).toHaveLength(6)
    })

    it("is rendered by default", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByRole("gridcell")).toHaveLength(7)
      })
    })
  })

  describe("Fixed IPs column", () => {
    it("renders every fixed IP with its subnet name and without the subnet ID", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("10.180.242.42")).toBeInTheDocument()
      })
      expect(screen.getByText("dualstack-v4")).toBeInTheDocument()
      expect(screen.getByText("fd00:1234:feed:cafe::328")).toBeInTheDocument()
      expect(screen.getByText("dualstack-v6")).toBeInTheDocument()
      expect(screen.queryByText("subnet-v4")).not.toBeInTheDocument()
    })

    it("falls back to the subnet ID when the subnet name is unknown", async () => {
      renderComponent({
        ...mockPort,
        fixed_ips: [{ subnet_id: "subnet-v4", ip_address: "10.180.242.42", ip_version: 4 }],
      })

      await waitFor(() => {
        expect(screen.getByText("subnet-v4")).toBeInTheDocument()
      })
    })
  })

  describe("Device column", () => {
    it("renders the device owner with the device ID below", async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("compute:qa-de-1b")).toBeInTheDocument()
      })
      expect(screen.getByText("server-1")).toBeInTheDocument()
    })

    it("renders a dash for the owner when only the device ID is set", async () => {
      renderComponent({ ...mockPort, device_owner: "" })

      await waitFor(() => {
        expect(screen.getByText("server-1")).toBeInTheDocument()
      })
      expect(screen.getAllByText("–")).toHaveLength(1)
    })
  })

  describe("Empty values", () => {
    it("renders a dash for description, fixed IPs and device when not set", async () => {
      renderComponent(unattachedPort)

      await waitFor(() => {
        expect(screen.getAllByText("–")).toHaveLength(3)
      })
    })
  })

  describe("Navigation", () => {
    const expectedNavigation = {
      to: "/projects/$projectId/network/ports/$portId",
      params: { projectId: "proj-1", portId: "port-123" },
    }

    it("navigates to the details page when the row is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText("db-port")).toBeInTheDocument()
      })

      await user.click(screen.getByText("db-port"))

      expect(mockNavigate).toHaveBeenCalledWith(expectedNavigation)
    })

    it("navigates to the details page when Show Details is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      const row = await screen.findByTestId("port-row-port-123")
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

      const row = await screen.findByTestId("port-row-port-123")
      await user.click(row.querySelector("button")!)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("renders only read-only menu items", async () => {
      const user = userEvent.setup()
      renderComponent()

      const row = await screen.findByTestId("port-row-port-123")
      await user.click(row.querySelector("button")!)

      expect(await screen.findByText("Show Details")).toBeInTheDocument()
      expect(screen.getAllByRole("menuitem")).toHaveLength(1)
    })
  })
})
