import { render, screen, act, waitFor } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest"
import { EditSpecModal } from "./EditSpecModal"
import { TrpcClient } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { Flavor } from "@/server/Compute/types/flavor"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("EditSpecModal", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockClient = {
    compute: {
      canUser: {
        query: vi.fn().mockResolvedValue(true),
      },
      getExtraSpecs: {
        query: vi.fn().mockResolvedValue({}),
      },
      createExtraSpecs: {
        mutate: vi.fn().mockResolvedValue({ success: true }),
      },
      deleteExtraSpec: {
        mutate: vi.fn().mockResolvedValue({ success: true }),
      },
    },
  } as unknown as TrpcClient

  const mockFlavor: Flavor = {
    id: "test-flavor-id",
    name: "Test Flavor",
    vcpus: 2,
    ram: 1024,
    disk: 10,
  }

  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the modal when open", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    expect(screen.getByText("Edit Extra Specs")).toBeInTheDocument()
  })

  it("does not render when modal is closed", () => {
    render(
      <EditSpecModal
        client={mockClient}
        isOpen={false}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockFlavor}
      />,
      { wrapper: TestingProvider }
    )

    expect(screen.queryByText("Edit Extra Specs")).not.toBeInTheDocument()
  })

  it("shows add button when user has create permissions", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => {
      const addSpecButton = screen.getByRole("button", { name: /Add Extra Spec/i })
      expect(addSpecButton).toBeInTheDocument()
    })
  })

  it("hides add button when user lacks create permissions", async () => {
    const mockClientNoPermission = {
      ...mockClient,
      compute: {
        ...mockClient.compute,
        canUser: {
          query: vi.fn().mockResolvedValue(false),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClientNoPermission}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => {
      expect(screen.queryByText("Add Extra Spec")).not.toBeInTheDocument()
    })
  })

  it("displays existing extra specs", async () => {
    const mockClientWithSpecs = {
      ...mockClient,
      compute: {
        ...mockClient.compute,
        getExtraSpecs: {
          query: vi.fn().mockResolvedValue({
            "hw:cpu_policy": "dedicated",
            "hw:mem_page_size": "large",
          }),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClientWithSpecs}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => {
      expect(screen.getByText("hw:cpu_policy")).toBeInTheDocument()
      expect(screen.getByText("dedicated")).toBeInTheDocument()
      expect(screen.getByText("hw:mem_page_size")).toBeInTheDocument()
      expect(screen.getByText("large")).toBeInTheDocument()
    })
  })

  it("shows empty state when no specs exist", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => {
      expect(screen.getByText('No extra specs found. Click "Add Extra Spec" to create one.')).toBeInTheDocument()
    })
  })

  it("handles null flavor with not rendering", async () => {
    await act(async () => {
      render(
        <EditSpecModal client={mockClient} isOpen={true} onClose={mockOnClose} project="test-project" flavor={null} />,
        { wrapper: TestingProvider }
      )
    })

    expect(screen.queryByText("Edit Extra Specs")).not.toBeInTheDocument()
    expect(screen.queryByText("Add Extra Spec")).not.toBeInTheDocument()
  })

  it("fetches extra specs with correct parameters", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => {
      expect(mockClient.compute.getExtraSpecs.query).toHaveBeenCalledWith({
        projectId: "test-project",
        flavorId: "test-flavor-id",
      })
    })
  })

  it("checks user permissions on mount", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => {
      expect(mockClient.compute.canUser.query).toHaveBeenCalledWith("flavor_specs:create")
      expect(mockClient.compute.canUser.query).toHaveBeenCalledWith("flavor_specs:delete")
    })
  })
})
