import { render, screen, waitFor, act } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest"
import { ManageAccessModal } from "./ManageAccessModal"
import { TrpcClient } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { Flavor } from "@/server/Compute/types/flavor"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

describe("ManageAccessModal", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const createMockClient = (overrides?: {
    canUser?: boolean[]
    flavorAccess?: Array<{ flavor_id: string; tenant_id: string }>
  }) => {
    return {
      compute: {
        canUser: {
          query: vi.fn().mockResolvedValue(overrides?.canUser ?? [true, true]),
        },
        getFlavorAccess: {
          query: vi.fn().mockResolvedValue(overrides?.flavorAccess ?? []),
        },
        addTenantAccess: {
          mutate: vi.fn().mockResolvedValue([]),
        },
        removeTenantAccess: {
          mutate: vi.fn().mockResolvedValue([]),
        },
      },
    } as unknown as TrpcClient
  }

  const mockPrivateFlavor: Flavor = {
    id: "test-flavor-id",
    name: "Test Flavor",
    vcpus: 2,
    ram: 1024,
    disk: 10,
    "os-flavor-access:is_public": false,
  }

  const mockPublicFlavor: Flavor = {
    id: "test-public-flavor-id",
    name: "Public Flavor",
    vcpus: 4,
    ram: 2048,
    disk: 20,
    "os-flavor-access:is_public": true,
  }

  const mockOnClose = vi.fn() as () => void

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the modal when open", async () => {
    const mockClient = createMockClient()

    render(
      <ManageAccessModal
        client={mockClient}
        isOpen={true}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockPrivateFlavor}
      />,
      { wrapper: TestingProvider }
    )

    expect(screen.getByText("Manage Access - Test Flavor")).toBeInTheDocument()
  })

  it("does not render when modal is closed", () => {
    const mockClient = createMockClient()

    render(
      <ManageAccessModal
        client={mockClient}
        isOpen={false}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockPrivateFlavor}
      />,
      { wrapper: TestingProvider }
    )

    expect(screen.queryByText("Manage Access - Test Flavor")).not.toBeInTheDocument()
  })

  it("handles null flavor with not rendering", () => {
    const mockClient = createMockClient()

    render(
      <ManageAccessModal
        client={mockClient}
        isOpen={true}
        onClose={mockOnClose}
        project="test-project"
        flavor={null}
      />,
      { wrapper: TestingProvider }
    )

    expect(screen.queryByText("Manage Access - Test Flavor")).not.toBeInTheDocument()
    expect(screen.queryByText("Add Tenant")).not.toBeInTheDocument()
  })

  it("shows public flavor information message", async () => {
    const mockClient = createMockClient()

    render(
      <ManageAccessModal
        client={mockClient}
        isOpen={true}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockPublicFlavor}
      />,
      { wrapper: TestingProvider }
    )

    // Wait for data to load, then the inner component shows the public message
    await waitFor(
      () => {
        expect(screen.getByText("This is a public flavor. All tenants have access to it.")).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
    expect(screen.queryByText("Add Tenant")).not.toBeInTheDocument()
  })

  it("fetches flavor access with correct parameters", async () => {
    const mockClient = createMockClient()

    render(
      <ManageAccessModal
        client={mockClient}
        isOpen={true}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockPrivateFlavor}
      />,
      { wrapper: TestingProvider }
    )

    await waitFor(
      () => {
        expect(mockClient.compute.getFlavorAccess.query).toHaveBeenCalledWith({
          project_id: "test-project",
          flavorId: "test-flavor-id",
        })
      },
      { timeout: 3000 }
    )
  })

  it("checks user permissions on mount", async () => {
    const mockClient = createMockClient()

    render(
      <ManageAccessModal
        client={mockClient}
        isOpen={true}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockPrivateFlavor}
      />,
      { wrapper: TestingProvider }
    )

    await waitFor(
      () => {
        expect(mockClient.compute.canUser.query).toHaveBeenCalledWith({
          project_id: "test-project",
          permission: ["flavors:add_project", "flavors:remove_project"],
        })
      },
      { timeout: 3000 }
    )
  })

  it("displays existing tenant access rows with delete buttons when user has permissions", async () => {
    const mockClient = createMockClient({
      flavorAccess: [
        { flavor_id: "test-flavor-id", tenant_id: "tenant-a" },
        { flavor_id: "test-flavor-id", tenant_id: "tenant-b" },
      ],
    })

    render(
      <ManageAccessModal
        client={mockClient}
        isOpen={true}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockPrivateFlavor}
      />,
      { wrapper: TestingProvider }
    )

    await waitFor(
      () => {
        expect(screen.getByText("tenant-a")).toBeInTheDocument()
        expect(screen.getByText("tenant-b")).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // When canRemove is true, delete buttons should be present
    await waitFor(
      () => {
        expect(screen.getByTestId("delete-tenant-a")).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it("shows empty state when no access exists for private flavor", async () => {
    const mockClient = createMockClient()

    render(
      <ManageAccessModal
        client={mockClient}
        isOpen={true}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockPrivateFlavor}
      />,
      { wrapper: TestingProvider }
    )

    await waitFor(
      () => {
        expect(screen.getByText('No tenant access configured. Click "Add Tenant" to grant access.')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it("hides add button when user lacks add permissions", async () => {
    const mockClient = createMockClient({ canUser: [false, true] })

    render(
      <ManageAccessModal
        client={mockClient}
        isOpen={true}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockPrivateFlavor}
      />,
      { wrapper: TestingProvider }
    )

    // Wait for data to load (empty state message appears)
    await waitFor(
      () => {
        expect(screen.getByText("No tenant access configured.")).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    expect(screen.queryByText("Add Tenant")).not.toBeInTheDocument()
  })
})
