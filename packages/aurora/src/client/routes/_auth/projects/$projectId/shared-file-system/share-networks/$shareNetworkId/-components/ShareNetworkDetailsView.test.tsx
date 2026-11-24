import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { trpcReact } from "@/client/trpcClient"
import { ShareNetworkDetailsView } from "./ShareNetworkDetailsView"

const { mockLoaderData, mockRouteContext } = vi.hoisted(() => ({
  mockLoaderData: vi.fn(),
  mockRouteContext: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useLoaderData: () => mockLoaderData(),
  useRouteContext: () => mockRouteContext(),
}))

vi.mock("@/server/Authentication/helpers", () => ({
  getServiceIndex: (services: { type: string }[]) => Object.fromEntries(services.map((s) => [s.type, s])),
}))

// Mocks
vi.mock("@/client/hooks/useSharedFileSystemPermissions", () => ({
  useSharedFileSystemPermissions: () => ({
    canListSecurityServices: true,
  }),
}))

vi.mock("./ShareNetworkSubnetsTable", () => ({
  ShareNetworkSubnetsTable: vi.fn(({ subnets, projectId, networksAvailable }) => (
    <div
      data-testid="subnets-table-mock"
      data-networks-available={String(networksAvailable)}
      data-project-id={projectId}
    >
      Subnets: {subnets.length}
    </div>
  )),
}))

vi.mock("./ShareNetworkSecurityServicesTable", () => ({
  ShareNetworkSecurityServicesTable: vi.fn(({ securityServices, isLoading, error, canList }) => (
    <div data-testid="security-services-table-mock">
      {canList ? `Security Services: ${securityServices.length}` : "No permission"}
      {isLoading && " (loading)"}
      {error && " (error)"}
    </div>
  )),
}))

const mockShareNetwork: ShareNetwork = {
  id: "net-123",
  name: "My Network",
  description: "Test description",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-16T12:00:00Z",
  share_network_subnets: [{ id: "sub-1" }, { id: "sub-2" }],
}

const mockSecurityServices: SecurityService[] = [
  {
    id: "sec-1",
    name: "Service 1",
    type: "ldap",
    status: "new",
    project_id: null,
    user: null,
    dns_ip: null,
    ou: null,
    domain: null,
    server: null,
    description: null,
    created_at: null,
    updated_at: null,
  },
]

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    sharedFileSystem: {
      listSecurityServices: {
        useQuery: vi.fn(),
      },
    },
  },
}))

describe("ShareNetworkDetailsView", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    i18n.activate("en")
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    // Default mocks: network service available, all services enabled
    mockLoaderData.mockReturnValue({
      availableServices: [{ type: "network" }],
    })
    mockRouteContext.mockReturnValue({
      enabledServices: undefined,
      deniedServices: undefined,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const renderComponent = (activeTab: "subnets" | "security-services" = "subnets") => {
    const onTabChange = vi.fn()
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <I18nProvider i18n={i18n}>
            <PortalProvider>
              <ShareNetworkDetailsView
                shareNetwork={mockShareNetwork}
                projectId="proj-1"
                activeTab={activeTab}
                onTabChange={onTabChange}
              />
            </PortalProvider>
          </I18nProvider>
        </QueryClientProvider>
      ),
      onTabChange,
    }
  }

  it("renders all field labels and values", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
      data: mockSecurityServices,
      isLoading: false,
      error: null,
    } as never)

    renderComponent()

    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("My Network")).toBeInTheDocument()
    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByText("net-123")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(screen.getByText("Test description")).toBeInTheDocument()
    expect(screen.getByText("Created")).toBeInTheDocument()
    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument()
    expect(screen.getByText("Updated")).toBeInTheDocument()
    expect(screen.getByText(/1\/16\/2024/)).toBeInTheDocument()
  })

  it("renders Subnets tab as active by default", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
      data: mockSecurityServices,
      isLoading: false,
      error: null,
    } as never)

    renderComponent("subnets")

    expect(screen.getByText("Subnets")).toBeInTheDocument()
    expect(screen.getByTestId("subnets-table-mock")).toHaveTextContent("Subnets: 2")
  })

  it("passes empty array to subnets table when share_network_subnets is missing", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
      data: mockSecurityServices,
      isLoading: false,
      error: null,
    } as never)

    const networkWithoutSubnets = { ...mockShareNetwork, share_network_subnets: undefined }
    render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ShareNetworkDetailsView
              shareNetwork={networkWithoutSubnets}
              projectId="proj-1"
              activeTab="subnets"
              onTabChange={vi.fn()}
            />
          </PortalProvider>
        </I18nProvider>
      </QueryClientProvider>
    )

    expect(screen.getByTestId("subnets-table-mock")).toHaveTextContent("Subnets: 0")
  })

  it("calls listSecurityServices.useQuery with project_id and shareNetworkId while Subnets tab is active", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
      data: mockSecurityServices,
      isLoading: false,
      error: null,
    } as never)

    renderComponent("subnets")

    expect(trpcReact.sharedFileSystem.listSecurityServices.useQuery).toHaveBeenCalledWith(
      { project_id: "proj-1", shareNetworkId: "net-123" },
      { enabled: true, retry: false }
    )
  })

  it("calls onTabChange when Security Services tab is clicked", async () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
      data: mockSecurityServices,
      isLoading: false,
      error: null,
    } as never)

    const { onTabChange } = renderComponent("subnets")
    const user = userEvent.setup()

    const securityServicesTab = screen.getByText("Security Services")
    await user.click(securityServicesTab)

    expect(onTabChange).toHaveBeenCalledWith("security-services")
  })

  it("still renders description list when security-services query fails", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "boom" } as never,
    } as never)

    renderComponent("security-services")

    expect(screen.getByText("My Network")).toBeInTheDocument()
    expect(screen.getByText("Test description")).toBeInTheDocument()
    expect(screen.getByTestId("security-services-table-mock")).toHaveTextContent("(error)")
  })

  describe("networksAvailable gate", () => {
    it("passes networksAvailable=true by default (network service in catalog, all services enabled)", () => {
      vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
        data: mockSecurityServices,
        isLoading: false,
        error: null,
      } as never)

      renderComponent("subnets")

      expect(screen.getByTestId("subnets-table-mock")).toHaveAttribute("data-networks-available", "true")
      expect(screen.getByTestId("subnets-table-mock")).toHaveAttribute("data-project-id", "proj-1")
    })

    it("passes networksAvailable=false when network service is not in the catalog", () => {
      mockLoaderData.mockReturnValue({ availableServices: [] })
      vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
        data: mockSecurityServices,
        isLoading: false,
        error: null,
      } as never)

      renderComponent("subnets")

      expect(screen.getByTestId("subnets-table-mock")).toHaveAttribute("data-networks-available", "false")
    })

    it("passes networksAvailable=false when networks service is denied", () => {
      mockRouteContext.mockReturnValue({
        enabledServices: undefined,
        deniedServices: ["networks"],
      })
      vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
        data: mockSecurityServices,
        isLoading: false,
        error: null,
      } as never)

      renderComponent("subnets")

      expect(screen.getByTestId("subnets-table-mock")).toHaveAttribute("data-networks-available", "false")
    })

    it("passes networksAvailable=false when enabledServices does not include networks", () => {
      mockRouteContext.mockReturnValue({
        enabledServices: ["shared-file-system"],
        deniedServices: undefined,
      })
      vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
        data: mockSecurityServices,
        isLoading: false,
        error: null,
      } as never)

      renderComponent("subnets")

      expect(screen.getByTestId("subnets-table-mock")).toHaveAttribute("data-networks-available", "false")
    })

    it("passes networksAvailable=true when enabledServices explicitly includes networks", () => {
      mockRouteContext.mockReturnValue({
        enabledServices: ["shared-file-system", "networks"],
        deniedServices: undefined,
      })
      vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
        data: mockSecurityServices,
        isLoading: false,
        error: null,
      } as never)

      renderComponent("subnets")

      expect(screen.getByTestId("subnets-table-mock")).toHaveAttribute("data-networks-available", "true")
    })
  })

  it("renders no extra tRPC query", () => {
    vi.mocked(trpcReact.sharedFileSystem.listSecurityServices.useQuery).mockReturnValue({
      data: mockSecurityServices,
      isLoading: false,
      error: null,
    } as never)

    renderComponent("subnets")

    expect(trpcReact.sharedFileSystem.listSecurityServices.useQuery).toHaveBeenCalledWith(
      { project_id: "proj-1", shareNetworkId: "net-123" },
      { enabled: true, retry: false }
    )
    expect(trpcReact.sharedFileSystem.listSecurityServices.useQuery).toHaveBeenCalledTimes(1)
  })
})
