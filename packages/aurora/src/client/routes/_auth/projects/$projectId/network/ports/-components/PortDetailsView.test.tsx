import { cleanup, render, screen, within } from "@testing-library/react"
import { describe, it, expect, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { PortDetails } from "@/server/Network/types/port"
import { PortDetailsView } from "./PortDetailsView"

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const mockPort: PortDetails = {
  id: "port-1",
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
  security_groups: [{ id: "sg-default", name: "default" }],
  allowed_address_pairs: [],
  project_id: "proj-1",
  created_at: "2025-02-28T14:36:21Z" as PortDetails["created_at"],
  updated_at: "2025-03-01T09:00:00Z" as PortDetails["updated_at"],
}

const unattachedPort: PortDetails = {
  ...mockPort,
  name: "",
  description: "",
  device_id: "",
  device_owner: "",
  fixed_ips: [],
  security_groups: [],
  created_at: undefined,
  updated_at: undefined,
}

const renderView = (port: PortDetails = mockPort) => render(<PortDetailsView port={port} />, { wrapper: TestWrapper })

describe("PortDetailsView", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe("Labels", () => {
    it("renders all field labels in the specified order", () => {
      renderView()

      const labels = screen.getAllByRole("term").map((term) => term.textContent)
      expect(labels).toEqual([
        "Port ID",
        "MAC",
        "Network",
        "IPs",
        "Description",
        "Name",
        "Device Owner",
        "Device ID",
        "Created at",
        "Updated at",
        "Project ID",
        "Status",
        "Security Groups",
      ])
    })
  })

  describe("Values", () => {
    it("renders the port ID, MAC and project ID", () => {
      renderView()

      expect(screen.getByText("port-1")).toBeInTheDocument()
      expect(screen.getByText("fa:16:3e:50:a2:79")).toBeInTheDocument()
      expect(screen.getByText("proj-1")).toBeInTheDocument()
    })

    it("renders the network name and ID", () => {
      renderView()

      expect(screen.getByText("dualstack-test")).toBeInTheDocument()
      expect(screen.getByText("net-1")).toBeInTheDocument()
    })

    it("renders only the network ID when the name is unknown", () => {
      renderView({ ...mockPort, network_name: undefined })

      expect(screen.getByText("net-1")).toBeInTheDocument()
      expect(screen.queryByText("dualstack-test")).not.toBeInTheDocument()
    })

    it("renders every fixed IP with its version and subnet name and ID", () => {
      renderView()

      const fixedIps = within(screen.getByTestId("port-fixed-ips"))
      expect(fixedIps.getByText("10.180.242.42")).toBeInTheDocument()
      expect(fixedIps.getByText("IPv4")).toBeInTheDocument()
      expect(fixedIps.getByText("dualstack-v4")).toBeInTheDocument()
      expect(fixedIps.getByText("subnet-v4")).toBeInTheDocument()
      expect(fixedIps.getByText("fd00:1234:feed:cafe::328")).toBeInTheDocument()
      expect(fixedIps.getByText("IPv6")).toBeInTheDocument()
      expect(fixedIps.getByText("dualstack-v6")).toBeInTheDocument()
      expect(fixedIps.getByText("subnet-v6")).toBeInTheDocument()
    })

    it("renders only the subnet ID when the subnet name is unknown", () => {
      renderView({
        ...mockPort,
        fixed_ips: [{ subnet_id: "subnet-v4", ip_address: "10.180.242.42", ip_version: 4 }],
      })

      const fixedIps = within(screen.getByTestId("port-fixed-ips"))
      expect(fixedIps.getByText("subnet-v4")).toBeInTheDocument()
      expect(fixedIps.queryByText("dualstack-v4")).not.toBeInTheDocument()
    })

    it("renders description, name, device, timestamps and status", () => {
      renderView()

      expect(screen.getByText("Reserved for the DB VM")).toBeInTheDocument()
      expect(screen.getByText("db-port")).toBeInTheDocument()
      expect(screen.getByText("compute:qa-de-1b")).toBeInTheDocument()
      expect(screen.getByText("server-1")).toBeInTheDocument()
      expect(screen.getByText("2025-02-28T14:36:21Z")).toBeInTheDocument()
      expect(screen.getByText("2025-03-01T09:00:00Z")).toBeInTheDocument()
      expect(screen.getByText("DOWN")).toBeInTheDocument()
    })

    it("renders security groups with name and ID", () => {
      renderView()

      const securityGroups = within(screen.getByTestId("port-security-groups"))
      expect(securityGroups.getByText("default")).toBeInTheDocument()
      expect(securityGroups.getByText("sg-default")).toBeInTheDocument()
    })

    it("renders only the security group ID when the name is unknown", () => {
      renderView({ ...mockPort, security_groups: [{ id: "sg-default" }] })

      const securityGroups = within(screen.getByTestId("port-security-groups"))
      expect(securityGroups.getByText("sg-default")).toBeInTheDocument()
      expect(securityGroups.queryByText("default")).not.toBeInTheDocument()
    })
  })

  describe("Copy to clipboard", () => {
    it.each(["port-1", "fa:16:3e:50:a2:79", "net-1", "10.180.242.42", "subnet-v4", "server-1", "proj-1", "sg-default"])(
      "makes %s copyable",
      (value) => {
        renderView()

        expect(screen.getByText(value).closest(".copyableTooltip")).toBeInTheDocument()
      }
    )
  })

  describe("Empty values", () => {
    it("renders a dash for every empty field", () => {
      renderView(unattachedPort)

      // IPs, Description, Name, Device Owner, Device ID, Created at, Updated at, Security Groups
      expect(screen.getAllByText("—")).toHaveLength(8)
      expect(screen.queryByTestId("port-fixed-ips")).not.toBeInTheDocument()
      expect(screen.queryByTestId("port-security-groups")).not.toBeInTheDocument()
    })

    it("does not render an IP version when it is unknown", () => {
      renderView({ ...mockPort, fixed_ips: [{ subnet_id: "subnet-x", ip_address: "not-an-ip" }] })

      expect(screen.queryByText(/^IPv/)).not.toBeInTheDocument()
    })
  })
})
