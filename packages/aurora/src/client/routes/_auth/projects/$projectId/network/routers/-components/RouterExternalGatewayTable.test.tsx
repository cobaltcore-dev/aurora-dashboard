import { cleanup, render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { RouterDetails } from "@/server/Network/types/router"
import { RouterExternalGatewayTable } from "./RouterExternalGatewayTable"

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

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

type ExternalGateway = NonNullable<RouterDetails["external_gateway_info"]>

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const mockGateway: ExternalGateway = {
  network_id: "ext-net-1",
  network_name: "FloatingIP-external-01",
  enable_snat: true,
  external_fixed_ips: [{ subnet_id: "ext-subnet-1", ip_address: "10.236.36.217", subnet_name: "FloatingIP-sap-01" }],
}

const renderTable = (gateway: ExternalGateway = mockGateway) =>
  render(<RouterExternalGatewayTable gateway={gateway} />, { wrapper: TestWrapper })

describe("RouterExternalGatewayTable", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders the column headers", () => {
    renderTable()

    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Name / ID",
      "External Fixed IPs",
      "SNAT",
    ])
  })

  it("links the network name to its detail page, with a copyable ID beneath", () => {
    renderTable()

    const link = screen.getByRole("link", { name: /FloatingIP-external-01/ })
    expect(link).toHaveAttribute("href", "/projects/proj-1/network/networks/ext-net-1")
    expect(link).toHaveClass("text-inherit", "hover:underline")
    expect(screen.getByRole("button", { name: /copy ext-net-1 to clipboard/i })).toBeInTheDocument()
  })

  it("stacks the fixed IP over its subnet ID (copy affordance)", () => {
    renderTable()

    expect(screen.getByText("10.236.36.217")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /copy ext-subnet-1 to clipboard/i })).toBeInTheDocument()
  })

  it("renders Enabled / Disabled for SNAT", () => {
    renderTable()
    expect(screen.getByText("Enabled")).toBeInTheDocument()

    cleanup()
    renderTable({ ...mockGateway, enable_snat: false })
    expect(screen.getByText("Disabled")).toBeInTheDocument()
  })

  it("links the network ID when the network name is unknown", () => {
    renderTable({ ...mockGateway, network_name: undefined })

    expect(screen.getAllByText("- -")).toHaveLength(1)
    const link = screen.getByRole("link", { name: /ext-net-1/ })
    expect(link).toHaveAttribute("href", "/projects/proj-1/network/networks/ext-net-1")
    expect(screen.getByRole("button", { name: /copy ext-net-1 to clipboard/i })).toBeInTheDocument()
  })

  it("falls back to the placeholder when there are no external fixed IPs", () => {
    renderTable({ ...mockGateway, external_fixed_ips: [] })

    expect(screen.getAllByText("- -")).toHaveLength(1)
  })

  it("falls back to the placeholder for SNAT when enable_snat is not returned", () => {
    renderTable({ ...mockGateway, enable_snat: undefined })

    expect(screen.getByText("SNAT")).toBeInTheDocument()
    expect(screen.getAllByText("- -")).toHaveLength(1)
  })
})
