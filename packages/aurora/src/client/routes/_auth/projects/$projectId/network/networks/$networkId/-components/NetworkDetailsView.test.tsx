import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Network, NetworkSubnet } from "@/server/Network/types/network"
import { NetworkDetailsView, isNetworkDetailsTab, DEFAULT_NETWORK_DETAILS_TAB } from "./NetworkDetailsView"

const { mockListSubnetsQuery, mockRefetch } = vi.hoisted(() => ({
  mockListSubnetsQuery: vi.fn(),
  mockRefetch: vi.fn(),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    network: { networks: { listSubnets: { useQuery: mockListSubnetsQuery } } },
  },
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
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

describe("NetworkDetailsView", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Basic information", () => {
    it("renders all field labels", () => {
      mockSubnetsResult()
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
      renderView()

      expect(screen.getByRole("button", { name: /copy net-1 to clipboard/i })).toBeInTheDocument()
    })

    it("shows the owning project_id with copy affordance in the Shared field when the network is shared (E2)", () => {
      mockSubnetsResult()
      renderView({ ...mockNetwork, shared: true })

      // E2: copy button for project_id present; no copy button for "proj-1" (useProjectId)
      expect(screen.getByRole("button", { name: /copy proj-owner to clipboard/i })).toBeInTheDocument()
    })

    it("shows 'No' in the Shared field when the network is not shared", () => {
      mockSubnetsResult()
      renderView()

      expect(screen.getByText("No")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /copy proj-owner to clipboard/i })).not.toBeInTheDocument()
    })

    it("does not render a separate Project ID field", () => {
      mockSubnetsResult()
      renderView()

      expect(screen.queryByText("Project ID")).not.toBeInTheDocument()
    })

    it("renders DOWN and Disabled", () => {
      mockSubnetsResult()
      renderView({ ...mockNetwork, admin_state_up: false, port_security_enabled: false })

      expect(screen.getByText("DOWN")).toBeInTheDocument()
      expect(screen.getByText("Disabled")).toBeInTheDocument()
    })

    it("renders '- -' for absent optional fields", () => {
      mockSubnetsResult()
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
      renderView()

      expect(screen.getByText("Segmentation")).toBeInTheDocument()
    })
  })

  describe("Subnets tab", () => {
    it("renders the Subnets tab label", () => {
      mockSubnetsResult()
      renderView()

      expect(screen.getByText("Subnets")).toBeInTheDocument()
    })

    it("queries the subnets of the network", () => {
      mockSubnetsResult()
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
      renderView(mockNetwork, "subnets")

      await user.click(screen.getByRole("button", { name: "Retry subnets" }))

      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe("Ports tab (mount point)", () => {
    it("renders the Ports tab label", () => {
      mockSubnetsResult()
      renderView()

      expect(screen.getByText("Ports")).toBeInTheDocument()
    })

    it("renders a placeholder when the Ports tab is active", () => {
      mockSubnetsResult()
      renderView(mockNetwork, "ports")

      expect(screen.getByTestId("ports-placeholder")).toBeInTheDocument()
    })
  })

  describe("Routers tab (mount point)", () => {
    it("renders the Routers tab label", () => {
      mockSubnetsResult()
      renderView()

      expect(screen.getByText("Routers")).toBeInTheDocument()
    })

    it("renders a placeholder when the Routers tab is active", () => {
      mockSubnetsResult()
      renderView(mockNetwork, "routers")

      expect(screen.getByTestId("routers-placeholder")).toBeInTheDocument()
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
