import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { NetworkSubnet } from "@/server/Network/types/network"
import { NetworkSubnetsTable } from "./NetworkSubnetsTable"

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const mockSubnets: NetworkSubnet[] = [
  {
    id: "subnet-v4",
    name: "private-v4",
    cidr: "10.0.0.0/24",
    ip_version: 4,
    gateway_ip: "10.0.0.1",
    enable_dhcp: true,
    allocation_pools: [{ start: "10.0.0.2", end: "10.0.0.254" }],
    dns_nameservers: ["8.8.8.8", "8.8.4.4"],
    host_routes: [{ destination: "192.168.1.0/24", nexthop: "10.0.0.100" }],
  },
  {
    id: "subnet-v6",
    name: "",
    cidr: "fd00::/64",
    ip_version: 6,
    gateway_ip: null,
    enable_dhcp: false,
    allocation_pools: [],
    dns_nameservers: [],
    host_routes: [],
  },
]

const renderTable = (props: Partial<React.ComponentProps<typeof NetworkSubnetsTable>> = {}) =>
  render(<NetworkSubnetsTable subnets={mockSubnets} isLoading={false} isError={false} error={null} {...props} />, {
    wrapper: TestWrapper,
  })

describe("NetworkSubnetsTable", () => {
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
      "Name",
      "CIDR",
      "IP Version",
      "Gateway IP",
      "DHCP",
      "Allocation Pools",
      "DNS Nameservers",
      "Host Routes",
    ]) {
      expect(screen.getByText(header)).toBeInTheDocument()
    }
    expect(screen.getAllByRole("columnheader")).toHaveLength(8)
  })

  it("renders one row per subnet with all field values", () => {
    renderTable()

    const v4 = within(screen.getByTestId("network-subnet-row-subnet-v4"))
    expect(v4.getByText("private-v4")).toBeInTheDocument()
    expect(v4.getByRole("button", { name: /copy subnet-v4 to clipboard/i })).toBeInTheDocument()
    expect(v4.getByText("10.0.0.0/24")).toBeInTheDocument()
    expect(v4.getByText("IPv4")).toBeInTheDocument()
    expect(v4.getByText("10.0.0.1")).toBeInTheDocument()
    expect(v4.getByText("Yes")).toBeInTheDocument()
    expect(v4.getByText("10.0.0.2–10.0.0.254")).toBeInTheDocument()
    expect(v4.getByText("8.8.8.8, 8.8.4.4")).toBeInTheDocument()
    expect(v4.getByText("192.168.1.0/24 → 10.0.0.100")).toBeInTheDocument()
  })

  it("shows 'No' for DHCP disabled", () => {
    renderTable()

    const v6 = within(screen.getByTestId("network-subnet-row-subnet-v6"))
    expect(v6.getByText("No")).toBeInTheDocument()
  })

  it("shows copy affordance as the sole element when name is empty", () => {
    renderTable()

    const v6 = within(screen.getByTestId("network-subnet-row-subnet-v6"))
    expect(v6.getByRole("button", { name: /copy subnet-v6 to clipboard/i })).toBeInTheDocument()
    // No separate <span> name element above the copy button when name is empty
    expect(v6.queryByText("", { selector: "span.break-all" })).not.toBeInTheDocument()
  })

  it("renders '- -' for absent optional fields", () => {
    renderTable({
      subnets: [
        {
          id: "subnet-v4",
          name: "private-v4",
          cidr: "10.0.0.0/24",
          ip_version: 4,
          gateway_ip: null,
          enable_dhcp: undefined,
          allocation_pools: [],
          dns_nameservers: [],
          host_routes: [],
        },
      ],
    })

    const row = within(screen.getByTestId("network-subnet-row-subnet-v4"))
    // gateway_ip null, enable_dhcp undefined, empty pools/dns/routes → 5 "- -" values
    expect(row.getAllByText("- -")).toHaveLength(5)
  })

  it("host routes always shows '- -' when absent", () => {
    renderTable({ subnets: [mockSubnets[1]] })

    const v6 = within(screen.getByTestId("network-subnet-row-subnet-v6"))
    // gateway_ip null, empty pools, dns, host_routes → at least one "- -" per empty field
    const empties = v6.getAllByText("- -")
    expect(empties.length).toBeGreaterThanOrEqual(1)
  })

  it("renders multiple allocation pools", () => {
    renderTable({
      subnets: [
        {
          ...mockSubnets[0],
          allocation_pools: [
            { start: "10.0.0.2", end: "10.0.0.100" },
            { start: "10.0.0.200", end: "10.0.0.254" },
          ],
        },
      ],
    })

    expect(screen.getByText("10.0.0.2–10.0.0.100, 10.0.0.200–10.0.0.254")).toBeInTheDocument()
  })

  it("renders multiple host routes", () => {
    renderTable({
      subnets: [
        {
          ...mockSubnets[0],
          host_routes: [
            { destination: "192.168.1.0/24", nexthop: "10.0.0.100" },
            { destination: "172.16.0.0/12", nexthop: "10.0.0.200" },
          ],
        },
      ],
    })

    expect(screen.getByText("192.168.1.0/24 → 10.0.0.100, 172.16.0.0/12 → 10.0.0.200")).toBeInTheDocument()
  })

  it("renders the empty state", () => {
    renderTable({ subnets: [] })

    expect(screen.getByText("No Subnets")).toBeInTheDocument()
    expect(screen.getByText("This network has no subnets.")).toBeInTheDocument()
  })

  it("renders the loading state", () => {
    renderTable({ isLoading: true })

    expect(screen.getByText("Loading Subnets...")).toBeInTheDocument()
    expect(screen.queryByTestId("network-subnets-table")).not.toBeInTheDocument()
  })

  it("renders the error message and retries", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderTable({ isError: true, error: { message: "Access forbidden" }, onRetry })

    expect(screen.getByText("Access forbidden")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalled()
  })

  it("renders a default error title without a message", () => {
    renderTable({ isError: true, error: null })

    expect(screen.getByText("Failed to Load Subnets")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })
})
