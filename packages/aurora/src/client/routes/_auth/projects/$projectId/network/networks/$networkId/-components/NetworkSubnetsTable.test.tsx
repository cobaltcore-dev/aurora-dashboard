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
  },
  { id: "subnet-v6", name: "", cidr: "fd00::/64", ip_version: 6, gateway_ip: null, enable_dhcp: false },
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

  it("renders the column headers", () => {
    renderTable()

    for (const header of ["Name", "CIDR", "IP Version", "Gateway IP", "DHCP"]) {
      expect(screen.getByText(header)).toBeInTheDocument()
    }
    expect(screen.getAllByRole("columnheader")).toHaveLength(5)
  })

  it("renders one row per subnet", () => {
    renderTable()

    const v4 = within(screen.getByTestId("network-subnet-row-subnet-v4"))
    expect(v4.getByText("private-v4")).toBeInTheDocument()
    expect(v4.getByText("subnet-v4")).toBeInTheDocument()
    expect(v4.getByText("10.0.0.0/24")).toBeInTheDocument()
    expect(v4.getByText("IPv4")).toBeInTheDocument()
    expect(v4.getByText("10.0.0.1")).toBeInTheDocument()
    expect(v4.getByText("Enabled")).toBeInTheDocument()
  })

  it("falls back to the ID and dashes for missing values", () => {
    renderTable({ subnets: [{ ...mockSubnets[1], enable_dhcp: undefined }] })

    const v6 = within(screen.getByTestId("network-subnet-row-subnet-v6"))
    expect(v6.getAllByText("subnet-v6")).toHaveLength(1)
    expect(v6.getByText("IPv6")).toBeInTheDocument()
    expect(v6.getAllByText("—")).toHaveLength(2)
  })

  it("renders Disabled when DHCP is off", () => {
    renderTable()

    expect(within(screen.getByTestId("network-subnet-row-subnet-v6")).getByText("Disabled")).toBeInTheDocument()
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
