import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { ShareNetworkSubnet } from "@/server/SharedFileSystem/types/shareNetwork"
import { ShareNetworkSubnetsTable } from "./ShareNetworkSubnetsTable"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockSubnetFull: ShareNetworkSubnet = {
  id: "sub-123",
  availability_zone: "az1",
  cidr: "10.0.0.0/24",
  ip_version: 4,
  gateway: "10.0.0.1",
  network_type: "vxlan",
  mtu: 1500,
  segmentation_id: 1001,
  neutron_net_id: "net-456",
  neutron_subnet_id: "subnet-789",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: null,
}

const renderComponent = (subnets: ShareNetworkSubnet[] = [mockSubnetFull]) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ShareNetworkSubnetsTable subnets={subnets} />
      </PortalProvider>
    </I18nProvider>
  )

describe("ShareNetworkSubnetsTable", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the 10 column headers in the correct order", () => {
    renderComponent()

    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(10)
    expect(headers[0]).toHaveTextContent("Subnet ID")
    expect(headers[1]).toHaveTextContent("Availability Zone")
    expect(headers[2]).toHaveTextContent("CIDR")
    expect(headers[3]).toHaveTextContent("IP Version")
    expect(headers[4]).toHaveTextContent("Gateway")
    expect(headers[5]).toHaveTextContent("Network Type")
    expect(headers[6]).toHaveTextContent("MTU")
    expect(headers[7]).toHaveTextContent("Segmentation ID")
    expect(headers[8]).toHaveTextContent("Neutron Network")
    expect(headers[9]).toHaveTextContent("Neutron Subnet")
  })

  it("renders a full subnet with all ten fields", () => {
    renderComponent()

    expect(screen.getByText("sub-123")).toBeInTheDocument()
    expect(screen.getByText("az1")).toBeInTheDocument()
    expect(screen.getByText("10.0.0.0/24")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("10.0.0.1")).toBeInTheDocument()
    expect(screen.getByText("vxlan")).toBeInTheDocument()
    expect(screen.getByText("1500")).toBeInTheDocument()
    expect(screen.getByText("1001")).toBeInTheDocument()
    expect(screen.getByText("net-456")).toBeInTheDocument()
    expect(screen.getByText("subnet-789")).toBeInTheDocument()
  })

  it("renders - - for all missing fields", () => {
    const minimalSubnet: ShareNetworkSubnet = {}
    renderComponent([minimalSubnet])

    // 10 cells with "- -"
    const cells = screen.getAllByRole("gridcell").slice(0, 10)
    cells.forEach((cell) => {
      expect(cell).toHaveTextContent("- -")
    })
  })

  it("renders empty state when no subnets", () => {
    renderComponent([])

    expect(screen.getByText("No Subnets")).toBeInTheDocument()
    expect(screen.getByText("This share network has no subnets.")).toBeInTheDocument()
  })

  it("does not make rows clickable", async () => {
    const user = userEvent.setup()
    renderComponent()

    const rows = screen.getAllByRole("row")
    const dataRow = rows[1] // Skip header row

    await user.click(dataRow)

    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
