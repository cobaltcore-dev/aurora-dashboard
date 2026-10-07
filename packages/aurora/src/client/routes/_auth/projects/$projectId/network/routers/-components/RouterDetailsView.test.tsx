import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { RouterDetails, RouterInterface } from "@/server/Network/types/router"
import { RouterDetailsView } from "./RouterDetailsView"

const { mockListInterfacesQuery, mockRefetch } = vi.hoisted(() => ({
  mockListInterfacesQuery: vi.fn(),
  mockRefetch: vi.fn(),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    network: { routers: { listInterfaces: { useQuery: mockListInterfacesQuery } } },
  },
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

vi.mock("./RouterInterfacesTable", () => ({
  RouterInterfacesTable: ({
    interfaces,
    isLoading,
    isError,
    error,
    onRetry,
  }: {
    interfaces: RouterInterface[]
    isLoading: boolean
    isError: boolean
    error: { message?: string } | null
    onRetry?: () => void
  }) => (
    <div data-testid="router-interfaces-table" data-loading={isLoading} data-error={isError}>
      {interfaces.map((i) => i.port_id).join(",")}
      {error?.message}
      <button onClick={onRetry}>Retry interfaces</button>
    </div>
  ),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const mockRouter: RouterDetails = {
  id: "router-1",
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
    external_fixed_ips: [{ subnet_id: "ext-subnet-1", ip_address: "10.236.36.217", subnet_name: "FloatingIP-sap-01" }],
  },
}

const renderView = (router: RouterDetails = mockRouter) =>
  render(<RouterDetailsView router={router} />, { wrapper: TestWrapper })

describe("RouterDetailsView", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const mockInterfacesResult = (overrides: Record<string, unknown> = {}) =>
    mockListInterfacesQuery.mockReturnValue({
      data: [{ port_id: "port-1" }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
      ...overrides,
    })

  describe("Basic information", () => {
    it("renders all field labels", () => {
      mockInterfacesResult()
      renderView()

      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("ID")).toBeInTheDocument()
      expect(screen.getByText("Project ID")).toBeInTheDocument()
      expect(screen.getByText("Description")).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
      expect(screen.getByText("Admin State")).toBeInTheDocument()
    })

    it("renders the router attributes", () => {
      mockInterfacesResult()
      renderView()

      expect(screen.getByText("edge-router")).toBeInTheDocument()
      expect(screen.getByText("router-1")).toBeInTheDocument()
      expect(screen.getByText("proj-1")).toBeInTheDocument()
      expect(screen.getByText("Main edge router")).toBeInTheDocument()
      expect(screen.getByText("ACTIVE")).toBeInTheDocument()
      expect(screen.getByText("UP")).toBeInTheDocument()
    })

    it("renders DOWN for a disabled router", () => {
      mockInterfacesResult()
      renderView({ ...mockRouter, admin_state_up: false })

      expect(screen.getByText("DOWN")).toBeInTheDocument()
    })

    it("renders a dash for missing name and description", () => {
      mockInterfacesResult()
      renderView({ ...mockRouter, name: "", description: "" })

      expect(screen.getAllByText("—")).toHaveLength(2)
    })
  })

  describe("External Networks tab", () => {
    it("renders the tab labels", () => {
      mockInterfacesResult()
      renderView()

      expect(screen.getByText("External Networks")).toBeInTheDocument()
      expect(screen.getByText("Internal Networks")).toBeInTheDocument()
    })

    it("renders all gateway field labels", () => {
      mockInterfacesResult()
      renderView()

      expect(screen.getByText("Network Name")).toBeInTheDocument()
      expect(screen.getByText("Network ID")).toBeInTheDocument()
      expect(screen.getByText("SNAT")).toBeInTheDocument()
      expect(screen.getByText("External Fixed IPs")).toBeInTheDocument()
    })

    it("is active by default and shows the gateway", () => {
      mockInterfacesResult()
      renderView()

      expect(screen.getByText("FloatingIP-external-01")).toBeInTheDocument()
      expect(screen.getByText("ext-net-1")).toBeInTheDocument()
      expect(screen.getByText("Enabled")).toBeInTheDocument()
      expect(screen.getByTestId("external-fixed-ips")).toHaveTextContent("ext-subnet-1")
      expect(screen.getByTestId("external-fixed-ips")).toHaveTextContent("10.236.36.217")
      expect(screen.queryByTestId("router-interfaces-table")).not.toBeInTheDocument()
    })

    it("renders the subnet name next to the subnet ID", () => {
      mockInterfacesResult()
      renderView()

      expect(screen.getByTestId("external-fixed-ips")).toHaveTextContent("ext-subnet-1 (FloatingIP-sap-01)")
    })

    it("renders Disabled when SNAT is off", () => {
      mockInterfacesResult()
      renderView({
        ...mockRouter,
        external_gateway_info: { ...mockRouter.external_gateway_info!, enable_snat: false },
      })

      expect(screen.getByText("Disabled")).toBeInTheDocument()
    })

    it("renders a dash when the network name is unknown", () => {
      mockInterfacesResult()
      renderView({
        ...mockRouter,
        external_gateway_info: { ...mockRouter.external_gateway_info!, network_name: undefined },
      })

      expect(screen.getAllByText("—")).toHaveLength(1)
      expect(screen.getByText("ext-net-1")).toBeInTheDocument()
    })

    it("renders a dash when there are no external fixed IPs", () => {
      mockInterfacesResult()
      renderView({
        ...mockRouter,
        external_gateway_info: { ...mockRouter.external_gateway_info!, external_fixed_ips: [] },
      })

      expect(screen.queryByTestId("external-fixed-ips")).not.toBeInTheDocument()
      expect(screen.getAllByText("—")).toHaveLength(1)
    })

    it("hides the SNAT row when enable_snat is not returned", () => {
      mockInterfacesResult()
      renderView({
        ...mockRouter,
        external_gateway_info: { ...mockRouter.external_gateway_info!, enable_snat: undefined },
      })

      expect(screen.queryByText("SNAT")).not.toBeInTheDocument()
    })

    it("shows an empty state when the router has no gateway", () => {
      mockInterfacesResult()
      renderView({ ...mockRouter, external_gateway_info: null })

      expect(screen.getByText("No External Gateway")).toBeInTheDocument()
    })
  })

  describe("Internal Networks tab", () => {
    it("shows the interfaces table when selected", async () => {
      const user = userEvent.setup()
      mockInterfacesResult()
      renderView()

      await user.click(screen.getByText("Internal Networks"))

      expect(screen.getByTestId("router-interfaces-table")).toHaveTextContent("port-1")
      expect(screen.queryByText("FloatingIP-external-01")).not.toBeInTheDocument()
    })

    it("queries the interfaces of the router", () => {
      mockInterfacesResult()
      renderView()

      expect(mockListInterfacesQuery).toHaveBeenCalledWith({ project_id: "proj-1", router_id: "router-1" })
    })

    it("passes the error state to the table", async () => {
      const user = userEvent.setup()
      mockInterfacesResult({ data: undefined, isError: true, error: { message: "Ports could not be loaded" } })
      renderView()

      await user.click(screen.getByText("Internal Networks"))

      expect(screen.getByTestId("router-interfaces-table")).toHaveAttribute("data-error", "true")
      expect(screen.getByTestId("router-interfaces-table")).toHaveTextContent("Ports could not be loaded")
    })

    it("retries the interfaces query from the table", async () => {
      const user = userEvent.setup()
      mockInterfacesResult({ data: undefined, isError: true, error: { message: "Ports could not be loaded" } })
      renderView()

      await user.click(screen.getByText("Internal Networks"))
      await user.click(screen.getByRole("button", { name: "Retry interfaces" }))

      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })

    it("passes the loading state to the table", async () => {
      const user = userEvent.setup()
      mockInterfacesResult({ data: undefined, isLoading: true })
      renderView()

      await user.click(screen.getByText("Internal Networks"))

      expect(screen.getByTestId("router-interfaces-table")).toHaveAttribute("data-loading", "true")
    })
  })
})
