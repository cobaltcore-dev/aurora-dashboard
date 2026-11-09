import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Network, NetworkSubnet } from "@/server/Network/types/network"
import { NetworkDetailsView, isNetworkDetailsTab, DEFAULT_NETWORK_DETAILS_TAB } from "./NetworkDetailsView"

const { mockListSubnetsQuery, mockListPortsQuery, mockRefetch, mockLoaderData, mockRouteContext } = vi.hoisted(() => ({
  mockListSubnetsQuery: vi.fn(),
  mockListPortsQuery: vi.fn(),
  mockRefetch: vi.fn(),
  mockLoaderData: vi.fn(),
  mockRouteContext: vi.fn(),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    network: {
      networks: {
        listSubnets: { useQuery: mockListSubnetsQuery },
        listPorts: { useQuery: mockListPortsQuery },
      },
    },
  },
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

vi.mock("@tanstack/react-router", () => ({
  useLoaderData: () => mockLoaderData(),
  useRouteContext: () => mockRouteContext(),
}))

// Catalog index keyed by service type, so routersAvailable depends on the "network" type being present.
vi.mock("@/server/Authentication/helpers", () => ({
  getServiceIndex: (services: Array<{ type: string }>) =>
    services.reduce((acc: Record<string, object>, service) => ({ ...acc, [service.type]: {} }), {}),
}))

vi.mock("./NetworkSubnetsTable", () => ({
  NetworkSubnetsTable: ({
    subnets,
    isLoading,
    isError,
    error,
    onRetry,
  }: {
    subnets: NetworkSubnet[]
    isLoading: boolean
    isError: boolean
    error: { message?: string } | null
    onRetry?: () => void
  }) => (
    <div data-testid="network-subnets-table" data-loading={isLoading} data-error={isError}>
      {subnets.map((subnet) => subnet.id).join(",")}
      {error?.message}
      <button onClick={onRetry}>Retry subnets</button>
    </div>
  ),
}))

vi.mock("./NetworkPortsTable", () => ({
  NetworkPortsTable: ({
    isLoading,
    isError,
    onRetry,
    routersAvailable,
    projectId,
  }: {
    isLoading: boolean
    isError: boolean
    onRetry?: () => void
    routersAvailable: boolean
    projectId: string
  }) => (
    <div
      data-testid="network-ports-table"
      data-loading={isLoading}
      data-error={isError}
      data-routers-available={routersAvailable}
      data-project-id={projectId}
    >
      <button onClick={onRetry}>Retry ports</button>
    </div>
  ),
}))

vi.mock("./NetworkRoutersTab", () => ({
  NetworkRoutersTab: ({
    isLoading,
    isError,
    onRetry,
    routersAvailable,
    projectId,
  }: {
    isLoading: boolean
    isError: boolean
    onRetry?: () => void
    routersAvailable: boolean
    projectId: string
  }) => (
    <div
      data-testid="network-routers-tab"
      data-loading={isLoading}
      data-error={isError}
      data-routers-available={routersAvailable}
      data-project-id={projectId}
    >
      <button onClick={onRetry}>Retry routers</button>
    </div>
  ),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const mockNetwork: Network = {
  id: "net-1",
  name: "private",
  description: "App tier",
  status: "ACTIVE",
  admin_state_up: true,
  shared: false,
  subnets: ["subnet-1", "subnet-2"],
  // Different from useProjectId() "proj-1" so E2 copy affordance is unambiguous when shared=true
  project_id: "proj-owner",
  mtu: 8950,
  "router:external": true,
  port_security_enabled: true,
  availability_zones: ["qa-de-1a", "qa-de-1b"],
  tags: ["env:prod", "team:net"],
  created_at: "2025-02-28T14:36:21Z",
  updated_at: "2025-03-01T10:00:00Z",
  "provider:network_type": "vlan",
  "provider:physical_network": "physnet1",
  "provider:segmentation_id": 100,
} as Network

const renderView = (network: Network = mockNetwork, activeTab = DEFAULT_NETWORK_DETAILS_TAB, onTabChange = vi.fn()) =>
  render(<NetworkDetailsView network={network} activeTab={activeTab} onTabChange={onTabChange} />, {
    wrapper: TestWrapper,
  })

const mockSubnetsResult = (overrides: Record<string, unknown> = {}) =>
  mockListSubnetsQuery.mockReturnValue({
    data: [{ id: "subnet-1" }],
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  })

const mockPortsResult = (overrides: Record<string, unknown> = {}) =>
  mockListPortsQuery.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  })

describe("NetworkDetailsView", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    // Default: network service in the catalog + routers enabled → routersAvailable = true
    mockLoaderData.mockReturnValue({ availableServices: [{ type: "network" }] })
    mockRouteContext.mockReturnValue({ enabledServices: undefined, deniedServices: undefined })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Basic information", () => {
    it("renders all field labels", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      for (const label of [
        "Name",
        "ID",
        "Description",
        "Status",
        "Admin State",
        "MTU",
        "Shared",
        "External",
        "Port Security",
        "Availability Zones",
        "Tags",
        "Created",
        "Updated",
        "Subnet count",
        "Segment count",
      ]) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    })

    it("renders the network attributes", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      expect(screen.getByText("private")).toBeInTheDocument()
      expect(screen.getByText("net-1")).toBeInTheDocument()
      expect(screen.getByText("App tier")).toBeInTheDocument()
      expect(screen.getByText("ACTIVE")).toBeInTheDocument()
      expect(screen.getByText("UP")).toBeInTheDocument()
      expect(screen.getByText("8950")).toBeInTheDocument()
      // shared=false → shows "No"; project_id copy button NOT present
      expect(screen.getByText("No")).toBeInTheDocument()
      expect(screen.getByText("Yes")).toBeInTheDocument()
      expect(screen.getByText("Enabled")).toBeInTheDocument()
      expect(screen.getByText("qa-de-1a, qa-de-1b")).toBeInTheDocument()
      expect(screen.getByText("env:prod, team:net")).toBeInTheDocument()
      expect(screen.getByText(new Date("2025-02-28T14:36:21Z").toLocaleString())).toBeInTheDocument()
      // subnets count
      expect(screen.getByText("2")).toBeInTheDocument()
    })

    it("shows a copy affordance for the network ID", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      expect(screen.getByRole("button", { name: /copy net-1 to clipboard/i })).toBeInTheDocument()
    })

    it("shows the owning project_id with copy affordance in the Shared field when the network is shared (E2)", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView({ ...mockNetwork, shared: true })

      // E2: copy button for project_id present; no copy button for "proj-1" (useProjectId)
      expect(screen.getByRole("button", { name: /copy proj-owner to clipboard/i })).toBeInTheDocument()
    })

    it("shows 'No' in the Shared field when the network is not shared", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      expect(screen.getByText("No")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /copy proj-owner to clipboard/i })).not.toBeInTheDocument()
    })

    it("does not render a separate Project ID field", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      expect(screen.queryByText("Project ID")).not.toBeInTheDocument()
    })

    it("renders DOWN and Disabled", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView({ ...mockNetwork, admin_state_up: false, port_security_enabled: false })

      expect(screen.getByText("DOWN")).toBeInTheDocument()
      expect(screen.getByText("Disabled")).toBeInTheDocument()
    })

    it("renders '- -' for absent optional fields", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView({
        id: "net-1",
        name: "",
        description: "",
        status: "ACTIVE",
        admin_state_up: true,
        shared: false,
        subnets: [],
        project_id: "proj-owner",
      } as Network)

      // name, description, MTU, external, port security, availability zones, tags, created, updated
      expect(screen.getAllByText("- -")).toHaveLength(9)
    })

    it("shows subnet count and segment count in the metadata", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      // subnets: ["subnet-1", "subnet-2"] → 2; provider:network_type present → 1 segment
      expect(screen.getByText("Subnet count")).toBeInTheDocument()
      expect(screen.getByText("Segment count")).toBeInTheDocument()
      // values: 2 subnets and 1 segment
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("1")).toBeInTheDocument()
    })
  })

  describe("Segmentation tab", () => {
    it("renders the Segmentation tab label", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      expect(screen.getByText("Segmentation")).toBeInTheDocument()
    })
  })

  describe("Subnets tab", () => {
    it("renders the Subnets tab label", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      expect(screen.getByText("Subnets")).toBeInTheDocument()
    })

    it("queries the subnets of the network", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "subnets")

      expect(mockListSubnetsQuery).toHaveBeenCalledWith({ project_id: "proj-1", network_id: "net-1" })
      expect(screen.getByTestId("network-subnets-table")).toHaveTextContent("subnet-1")
    })

    it("passes the loading state to the table", () => {
      mockSubnetsResult({ data: undefined, isLoading: true })
      renderView(mockNetwork, "subnets")

      expect(screen.getByTestId("network-subnets-table")).toHaveAttribute("data-loading", "true")
    })

    it("passes the error state to the table", () => {
      mockSubnetsResult({ data: undefined, isError: true, error: { message: "Access forbidden" } })
      renderView(mockNetwork, "subnets")

      const table = screen.getByTestId("network-subnets-table")
      expect(table).toHaveAttribute("data-error", "true")
      expect(table).toHaveTextContent("Access forbidden")
    })

    it("retries the subnets query from the table", async () => {
      const user = userEvent.setup()
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "subnets")

      await user.click(screen.getByRole("button", { name: "Retry subnets" }))

      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe("Ports tab", () => {
    it("renders the Ports tab label", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      expect(screen.getByText("Ports")).toBeInTheDocument()
    })

    it("queries the ports of the network", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "ports")

      expect(mockListPortsQuery).toHaveBeenCalledWith({ project_id: "proj-1", network_id: "net-1" })
      expect(screen.getByTestId("network-ports-table")).toBeInTheDocument()
    })

    it("passes the loading state to the ports table", () => {
      mockSubnetsResult()
      mockPortsResult({ data: undefined, isLoading: true })
      renderView(mockNetwork, "ports")

      expect(screen.getByTestId("network-ports-table")).toHaveAttribute("data-loading", "true")
    })

    it("passes the error state to the ports table", () => {
      mockSubnetsResult()
      mockPortsResult({ data: undefined, isError: true, error: { message: "Forbidden" } })
      renderView(mockNetwork, "ports")

      expect(screen.getByTestId("network-ports-table")).toHaveAttribute("data-error", "true")
    })

    it("retries the ports query from the table", async () => {
      const user = userEvent.setup()
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "ports")

      await user.click(screen.getByRole("button", { name: "Retry ports" }))

      expect(mockRefetch).toHaveBeenCalled()
    })

    it("passes routersAvailable and projectId to the ports table", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "ports")

      const table = screen.getByTestId("network-ports-table")
      expect(table).toHaveAttribute("data-routers-available", "true")
      expect(table).toHaveAttribute("data-project-id", "proj-1")
    })
  })

  describe("Routers tab", () => {
    it("renders the Routers tab label", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView()

      expect(screen.getByText("Routers")).toBeInTheDocument()
    })

    it("renders the routers tab using the same ports query", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "routers")

      expect(screen.getByTestId("network-routers-tab")).toBeInTheDocument()
    })

    it("passes the loading state to the routers tab", () => {
      mockSubnetsResult()
      mockPortsResult({ data: undefined, isLoading: true })
      renderView(mockNetwork, "routers")

      expect(screen.getByTestId("network-routers-tab")).toHaveAttribute("data-loading", "true")
    })

    it("retries via the same refetch as the ports tab", async () => {
      const user = userEvent.setup()
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "routers")

      await user.click(screen.getByRole("button", { name: "Retry routers" }))

      expect(mockRefetch).toHaveBeenCalled()
    })

    it("passes routersAvailable and projectId to the routers tab", () => {
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "routers")

      const tab = screen.getByTestId("network-routers-tab")
      expect(tab).toHaveAttribute("data-routers-available", "true")
      expect(tab).toHaveAttribute("data-project-id", "proj-1")
    })
  })

  describe("routers availability (I13)", () => {
    it("marks routers available when the network service is in the catalog and routers is enabled", () => {
      mockLoaderData.mockReturnValue({ availableServices: [{ type: "network" }] })
      mockRouteContext.mockReturnValue({ enabledServices: ["networks", "routers"], deniedServices: undefined })
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "ports")

      expect(screen.getByTestId("network-ports-table")).toHaveAttribute("data-routers-available", "true")
    })

    it("marks routers unavailable when the Routers scope is disabled", () => {
      mockLoaderData.mockReturnValue({ availableServices: [{ type: "network" }] })
      mockRouteContext.mockReturnValue({ enabledServices: ["networks"], deniedServices: undefined })
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "ports")

      expect(screen.getByTestId("network-ports-table")).toHaveAttribute("data-routers-available", "false")
    })

    it("marks routers unavailable when the network service is absent from the catalog", () => {
      mockLoaderData.mockReturnValue({ availableServices: [] })
      mockRouteContext.mockReturnValue({ enabledServices: undefined, deniedServices: undefined })
      mockSubnetsResult()
      mockPortsResult()
      renderView(mockNetwork, "routers")

      expect(screen.getByTestId("network-routers-tab")).toHaveAttribute("data-routers-available", "false")
    })
  })

  describe("isNetworkDetailsTab", () => {
    it("accepts all known tabs", () => {
      expect(isNetworkDetailsTab("segmentation")).toBe(true)
      expect(isNetworkDetailsTab("subnets")).toBe(true)
      expect(isNetworkDetailsTab("ports")).toBe(true)
      expect(isNetworkDetailsTab("routers")).toBe(true)
    })

    it("rejects unknown values", () => {
      expect(isNetworkDetailsTab("floatingips")).toBe(false)
      expect(isNetworkDetailsTab(undefined)).toBe(false)
    })

    it("defaults to the segmentation tab", () => {
      expect(DEFAULT_NETWORK_DETAILS_TAB).toBe("segmentation")
    })
  })
})
