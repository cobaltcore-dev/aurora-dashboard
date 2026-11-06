import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Port } from "@/server/Network/types/port"
import { NetworkRoutersTab } from "./NetworkRoutersTab"

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const basePort: Port = {
  id: "port-1",
  name: "",
  description: "",
  network_id: "net-1",
  mac_address: "fa:16:3e:aa:bb:cc",
  admin_state_up: true,
  status: "ACTIVE",
  device_id: "router-abc",
  device_owner: "network:router_interface",
  fixed_ips: [],
  security_groups: [],
  allowed_address_pairs: [],
  project_id: "proj-1",
}

const renderTab = (ports: Port[], props: Partial<React.ComponentProps<typeof NetworkRoutersTab>> = {}) =>
  render(<NetworkRoutersTab ports={ports} isLoading={false} isError={false} error={null} {...props} />, {
    wrapper: TestWrapper,
  })

describe("NetworkRoutersTab", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders a copy affordance for each attached router", () => {
    renderTab([basePort])

    expect(screen.getByRole("button", { name: /copy router-abc to clipboard/i })).toBeInTheDocument()
    expect(screen.getByTestId("routers-list")).toBeInTheDocument()
  })

  it("deduplicates routers when a router has multiple ports", () => {
    renderTab([
      basePort,
      { ...basePort, id: "port-2", fixed_ips: [{ ip_address: "10.0.0.1", subnet_id: "subnet-v6" }] },
    ])

    // Same router-abc from two ports → only one copy button
    expect(screen.getAllByRole("button", { name: /copy router-abc to clipboard/i })).toHaveLength(1)
  })

  it("shows multiple routers when there are different device_ids", () => {
    renderTab([basePort, { ...basePort, id: "port-3", device_id: "router-def" }])

    expect(screen.getByRole("button", { name: /copy router-abc to clipboard/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /copy router-def to clipboard/i })).toBeInTheDocument()
  })

  it("renders '- -' when no router_interface ports exist", () => {
    renderTab([{ ...basePort, device_owner: "compute:nova" }])

    expect(screen.getByTestId("routers-empty")).toBeInTheDocument()
    expect(screen.getByText("- -")).toBeInTheDocument()
    expect(screen.queryByTestId("routers-list")).not.toBeInTheDocument()
  })

  it("renders '- -' for an empty ports list", () => {
    renderTab([])

    expect(screen.getByText("- -")).toBeInTheDocument()
  })

  it("ignores ports with empty device_id", () => {
    renderTab([{ ...basePort, device_id: "" }])

    expect(screen.getByText("- -")).toBeInTheDocument()
  })

  it("renders the loading state", () => {
    renderTab([], { isLoading: true })

    expect(screen.getByText("Loading Routers...")).toBeInTheDocument()
  })

  it("renders the error state with retry", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderTab([], { isError: true, error: { message: "Network error" }, onRetry })

    expect(screen.getByText("Network error")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalled()
  })

  it("renders a default error title without a message", () => {
    renderTab([], { isError: true, error: null })

    expect(screen.getByText("Failed to Load Routers")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })
})
