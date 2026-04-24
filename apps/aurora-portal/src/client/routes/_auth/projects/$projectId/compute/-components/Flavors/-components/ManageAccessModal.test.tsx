import { render, screen, act, waitFor } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest"
import { ManageAccessModal } from "./ManageAccessModal"
import { TrpcClient } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { Flavor } from "@/server/Compute/types/flavor"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("ManageAccessModal", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockClient = {
    compute: {
      canUser: {
        query: vi.fn().mockResolvedValue([true, true]),
      },
      getFlavorAccess: {
        query: vi.fn().mockResolvedValue([]),
      },
      addTenantAccess: {
        mutate: vi.fn().mockResolvedValue([]),
      },
      removeTenantAccess: {
        mutate: vi.fn().mockResolvedValue([]),
      },
    },
  } as unknown as TrpcClient

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

  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the modal when open", async () => {
    await act(async () => {
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
    })

    expect(screen.getByText("Manage Access - Test Flavor")).toBeInTheDocument()
  })

  it("does not render when modal is closed", () => {
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

  it("shows add button when user has add permissions", async () => {
    await act(async () => {
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
    })

    await waitFor(() => {
      const addTenantButton = screen.getByRole("button", { name: /Add Tenant Access/i })
      expect(addTenantButton).toBeInTheDocument()
    })
  })

  it("hides add button when user lacks add permissions", async () => {
    const mockClientNoPermission = {
      ...mockClient,
      compute: {
        ...mockClient.compute,
        canUser: {
          query: vi.fn().mockResolvedValue([false, true]),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <ManageAccessModal
          client={mockClientNoPermission}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockPrivateFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => {
      expect(screen.queryByText("Add Tenant Access")).not.toBeInTheDocument()
    })
  })

  it("displays existing tenant access rows", async () => {
    const mockClientWithAccess = {
      ...mockClient,
      compute: {
        ...mockClient.compute,
        getFlavorAccess: {
          query: vi.fn().mockResolvedValue([
            { flavor_id: "test-flavor-id", tenant_id: "tenant-a" },
            { flavor_id: "test-flavor-id", tenant_id: "tenant-b" },
          ]),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <ManageAccessModal
          client={mockClientWithAccess}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockPrivateFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => {
      expect(screen.getByText("tenant-a")).toBeInTheDocument()
      expect(screen.getByText("tenant-b")).toBeInTheDocument()
    })
  })

  it("shows empty state when no access exists for private flavor", async () => {
    await act(async () => {
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
    })

    await waitFor(() => {
      expect(
        screen.getByText(
          'No specific tenant access configured for this private flavor. Click "Add Tenant Access" to grant access.'
        )
      ).toBeInTheDocument()
    })
  })

  it("shows public flavor information message", async () => {
    await act(async () => {
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
    })

    await waitFor(() => {
      expect(screen.getByText("This is a public flavor. All tenants have access to it.")).toBeInTheDocument()
      expect(screen.queryByText("Add Tenant Access")).not.toBeInTheDocument()
    })
  })

  it("handles null flavor with not rendering", async () => {
    await act(async () => {
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
    })

    expect(screen.queryByText("Manage Access - Test Flavor")).not.toBeInTheDocument()
    expect(screen.queryByText("Add Tenant Access")).not.toBeInTheDocument()
  })

  it("fetches flavor access with correct parameters", async () => {
    await act(async () => {
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
    })

    await waitFor(() => {
      expect(mockClient.compute.getFlavorAccess.query).toHaveBeenCalledWith({
        project_id: "test-project",
        flavorId: "test-flavor-id",
      })
    })
  })

  it("checks user permissions on mount", async () => {
    await act(async () => {
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
    })

    await waitFor(() => {
      expect(mockClient.compute.canUser.query).toHaveBeenCalledWith(["flavors:add_project", "flavors:remove_project"])
    })
  })
})
