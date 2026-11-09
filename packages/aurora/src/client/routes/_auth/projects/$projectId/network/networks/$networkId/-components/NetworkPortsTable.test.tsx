import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Port } from "@/server/Network/types/port"
import { NetworkPortsTable } from "./NetworkPortsTable"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string
    params: Record<string, string>
    children: ReactNode
    className?: string
  }) => {
    const href = Object.entries(params ?? {}).reduce((acc, [k, v]) => acc.replace(`$${k}`, v), to)
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  },
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const mockPorts: Port[] = [
  {
    id: "port-1",
    name: "",
    description: "",
    network_id: "net-1",
    mac_address: "fa:16:3e:aa:bb:cc",
    admin_state_up: true,
    status: "ACTIVE",
    device_id: "instance-123",
    device_owner: "compute:nova",
    fixed_ips: [{ ip_address: "10.0.0.5", subnet_id: "subnet-v4" }],
    security_groups: [],
    allowed_address_pairs: [],
    project_id: "proj-1",
  },
  {
    id: "port-2",
    name: "",
    description: "",
    network_id: "net-1",
    mac_address: "fa:16:3e:dd:ee:ff",
    admin_state_up: false,
    status: "DOWN",
    device_id: "router-456",
    device_owner: "network:router_interface",
    fixed_ips: [
      { ip_address: "10.0.0.1", subnet_id: "subnet-v4" },
      { ip_address: "fd00::1", subnet_id: "subnet-v6" },
    ],
    security_groups: [],
    allowed_address_pairs: [],
    project_id: "proj-1",
  },
  {
    id: "port-3",
    name: "",
    description: "",
    network_id: "net-1",
    mac_address: "fa:16:3e:11:22:33",
    admin_state_up: true,
    status: "ACTIVE",
    device_id: "",
    device_owner: "network:dhcp",
    fixed_ips: [],
    security_groups: [],
    allowed_address_pairs: [],
    project_id: "proj-1",
  },
]

const renderTable = (props: Partial<React.ComponentProps<typeof NetworkPortsTable>> = {}) =>
  render(
    <NetworkPortsTable
      ports={mockPorts}
      isLoading={false}
      isError={false}
      error={null}
      projectId="proj-1"
      routersAvailable={false}
      {...props}
    />,
    { wrapper: TestWrapper }
  )

describe("NetworkPortsTable", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders all column headers", () => {
    renderTable()

    for (const header of [
      "ID",
      "Status",
      "Admin State",
      "Fixed IPs",
      "MAC Address",
      "Device Owner",
      "Attached Device",
    ]) {
      expect(screen.getByText(header)).toBeInTheDocument()
    }
    expect(screen.getAllByRole("columnheader")).toHaveLength(7)
  })

  it("renders one row per port", () => {
    renderTable()

    expect(screen.getByTestId("network-port-row-port-1")).toBeInTheDocument()
    expect(screen.getByTestId("network-port-row-port-2")).toBeInTheDocument()
    expect(screen.getByTestId("network-port-row-port-3")).toBeInTheDocument()
  })

  it("shows copy affordance for port ID", () => {
    renderTable()

    const row = within(screen.getByTestId("network-port-row-port-1"))
    expect(row.getByRole("button", { name: /copy port-1 to clipboard/i })).toBeInTheDocument()
  })

  it("renders status and admin state", () => {
    renderTable()

    const row1 = within(screen.getByTestId("network-port-row-port-1"))
    expect(row1.getByText("ACTIVE")).toBeInTheDocument()
    expect(row1.getByText("Up")).toBeInTheDocument()

    const row2 = within(screen.getByTestId("network-port-row-port-2"))
    // status=DOWN (raw Neutron value) + admin_state_up=false → status cell "DOWN", admin cell "Down"
    expect(row2.getByText("DOWN")).toBeInTheDocument()
    expect(row2.getByText("Down")).toBeInTheDocument()
  })

  it("renders fixed IPs with subnet IDs", () => {
    renderTable()

    const row1 = within(screen.getByTestId("network-port-row-port-1"))
    expect(row1.getByText("10.0.0.5")).toBeInTheDocument()

    const row2 = within(screen.getByTestId("network-port-row-port-2"))
    expect(row2.getByText("10.0.0.1")).toBeInTheDocument()
    expect(row2.getByText("fd00::1")).toBeInTheDocument()
  })

  it("renders '- -' when fixed IPs are empty", () => {
    renderTable()

    const row3 = within(screen.getByTestId("network-port-row-port-3"))
    // port-3 also has empty device_id, so two cells show "- -"; check at least one is present
    expect(row3.getAllByText("- -")).not.toHaveLength(0)
  })

  it("maps device_owner to a human-friendly label", () => {
    renderTable()

    expect(within(screen.getByTestId("network-port-row-port-1")).getByText("Instance")).toBeInTheDocument()
    expect(within(screen.getByTestId("network-port-row-port-2")).getByText("Router interface")).toBeInTheDocument()
    expect(within(screen.getByTestId("network-port-row-port-3")).getByText("DHCP agent")).toBeInTheDocument()
  })

  it("falls back to the raw device_owner string for unrecognized values", () => {
    renderTable({
      ports: [{ ...mockPorts[0], device_owner: "network:custom_extension" }],
    })

    expect(screen.getByText("network:custom_extension")).toBeInTheDocument()
  })

  it("shows the floating IP label", () => {
    renderTable({ ports: [{ ...mockPorts[0], device_owner: "network:floatingip" }] })

    expect(screen.getByText("Floating IP")).toBeInTheDocument()
  })

  it("renders copy affordance for device_id", () => {
    renderTable()

    const row1 = within(screen.getByTestId("network-port-row-port-1"))
    expect(row1.getByRole("button", { name: /copy instance-123 to clipboard/i })).toBeInTheDocument()
  })

  it("renders '- -' when device_id is empty", () => {
    renderTable()

    const row3 = within(screen.getByTestId("network-port-row-port-3"))
    // fixed_ips empty → "- -", device_id empty → "- -"
    expect(row3.getAllByText("- -")).toHaveLength(2)
  })

  it("renders the empty state", () => {
    renderTable({ ports: [] })

    expect(screen.getByText("No Ports")).toBeInTheDocument()
    expect(screen.getByText("This network has no ports.")).toBeInTheDocument()
  })

  it("renders the loading state", () => {
    renderTable({ isLoading: true })

    expect(screen.getByText("Loading Ports...")).toBeInTheDocument()
    expect(screen.queryByTestId("network-ports-table")).not.toBeInTheDocument()
  })

  it("renders the error message and retries", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderTable({ isError: true, error: { message: "Forbidden" }, onRetry })

    expect(screen.getByText("Forbidden")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalled()
  })

  it("renders a default error title without a message", () => {
    renderTable({ isError: true, error: null })

    expect(screen.getByText("Failed to Load Ports")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  describe("router deep-link", () => {
    it("renders a link for a router_interface port when routersAvailable is true", () => {
      renderTable({ routersAvailable: true })

      const row2 = within(screen.getByTestId("network-port-row-port-2"))
      const link = row2.getByRole("link")
      expect(link).toHaveAttribute("href", expect.stringContaining("router-456"))
      expect(link).toHaveTextContent("router-456")
      // Copy affordance sits beside the link (I12)
      expect(row2.getByRole("button", { name: /copy router-456 to clipboard/i })).toBeInTheDocument()
    })

    it("does not render a link for a router_interface port when routersAvailable is false", () => {
      renderTable({ routersAvailable: false })

      const row2 = within(screen.getByTestId("network-port-row-port-2"))
      expect(row2.queryByRole("link")).not.toBeInTheDocument()
      expect(row2.getByRole("button", { name: /copy router-456 to clipboard/i })).toBeInTheDocument()
    })

    it("does not render a link for a non-router-interface port when routersAvailable is true", () => {
      renderTable({ routersAvailable: true })

      const row1 = within(screen.getByTestId("network-port-row-port-1"))
      expect(row1.queryByRole("link")).not.toBeInTheDocument()
    })
  })
})
