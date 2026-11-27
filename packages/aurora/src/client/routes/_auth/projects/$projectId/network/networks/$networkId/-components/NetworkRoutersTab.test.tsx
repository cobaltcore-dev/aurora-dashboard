import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Port } from "@/server/Network/types/port"
import type { RouterListItem } from "@/server/Network/types/router"
import { NetworkRoutersTab } from "./NetworkRoutersTab"

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

const mockRouter: RouterListItem = {
  id: "router-abc",
  name: "edge-router",
  description: "",
  status: "ACTIVE",
  admin_state_up: true,
  project_id: "proj-1",
  routes: [],
  external_gateway_info: { network_id: "ext-net-1", network_name: "FloatingIP-external-01" },
}

const renderTab = (ports: Port[], props: Partial<React.ComponentProps<typeof NetworkRoutersTab>> = {}) =>
  render(
    <NetworkRoutersTab
      ports={ports}
      isLoading={false}
      isError={false}
      error={null}
      routersAvailable={false}
      {...props}
    />,
    { wrapper: TestWrapper }
  )

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

  it("renders an empty state when no router_interface ports exist", () => {
    renderTab([{ ...basePort, device_owner: "compute:nova" }])

    expect(screen.getByText("No Routers Attached")).toBeInTheDocument()
    expect(screen.queryByTestId("routers-list")).not.toBeInTheDocument()
  })

  it("renders an empty state for an empty ports list", () => {
    renderTab([])

    expect(screen.getByText("No Routers Attached")).toBeInTheDocument()
  })

  it("ignores ports with empty device_id", () => {
    renderTab([{ ...basePort, device_id: "" }])

    expect(screen.getByText("No Routers Attached")).toBeInTheDocument()
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

  describe("resolved router data", () => {
    it("renders the column headers", () => {
      renderTab([basePort], { routersAvailable: true, routersById: new Map([[mockRouter.id, mockRouter]]) })

      expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
        "Status",
        "Name / ID",
        "Admin State",
        "External Gateway",
      ])
    })

    it("shows the resolved name, status, admin state and external gateway", () => {
      renderTab([basePort], { routersAvailable: true, routersById: new Map([[mockRouter.id, mockRouter]]) })

      expect(screen.getByText("edge-router")).toBeInTheDocument()
      expect(screen.getByText("FloatingIP-external-01")).toBeInTheDocument()
      // ID beneath the name with a copy affordance
      expect(screen.getByRole("button", { name: /copy router-abc to clipboard/i })).toBeInTheDocument()
    })

    it("links the resolved router name to its detail page", () => {
      renderTab([basePort], { routersAvailable: true, routersById: new Map([[mockRouter.id, mockRouter]]) })

      const link = screen.getByRole("link", { name: /edge-router/ })
      expect(link).toHaveAttribute("href", expect.stringContaining("router-abc"))
      // Default text color (not the link accent), underline on hover
      expect(link).toHaveClass("text-inherit", "hover:underline")
    })

    it("renders the name as plain text (no link) when routersAvailable is false", () => {
      renderTab([basePort], { routersAvailable: false, routersById: new Map([[mockRouter.id, mockRouter]]) })

      expect(screen.queryByRole("link")).not.toBeInTheDocument()
    })

    it("falls back to the ID link and placeholders when the router can't be resolved", () => {
      renderTab([basePort], { routersAvailable: true })

      // Name, Status, Admin State and External Gateway show the placeholder
      expect(screen.getAllByText("- -")).toHaveLength(4)
      // The unnamed router's ID line becomes the link, still with a copy affordance
      const link = screen.getByRole("link", { name: /router-abc/ })
      expect(link).toHaveAttribute("href", expect.stringContaining("router-abc"))
      expect(screen.getByRole("button", { name: /copy router-abc to clipboard/i })).toBeInTheDocument()
    })

    it("does not resolve details when routersAvailable is false", () => {
      renderTab([basePort], { routersAvailable: false, routersById: new Map([[mockRouter.id, mockRouter]]) })

      // Without the Routers scope the tab shows only the ID, not the resolved name
      expect(screen.queryByText("edge-router")).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /copy router-abc to clipboard/i })).toBeInTheDocument()
    })
  })
})
