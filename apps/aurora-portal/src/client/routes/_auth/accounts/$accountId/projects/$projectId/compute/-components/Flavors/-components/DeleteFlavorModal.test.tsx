import { render, screen, act, fireEvent } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi } from "vitest"
import { DeleteFlavorModal } from "./DeleteFlavorModal"
import { TrpcClient } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { Flavor } from "@/server/Compute/types/flavor"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("DeleteFlavorModal", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockClient = {
    compute: {
      deleteFlavor: {
        mutate: vi.fn().mockResolvedValue({ success: true, message: "Flavor deleted successfully" }),
      },
    },
  } as unknown as TrpcClient

  const mockFlavor: Flavor = {
    id: "test-flavor-id",
    name: "Test Flavor",
    vcpus: 2,
    ram: 1024,
    disk: 10,
    swap: 512,
    rxtx_factor: 1,
    "OS-FLV-EXT-DATA:ephemeral": 5,
    description: "A test flavor",
  }

  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the modal with flavor details", async () => {
    await act(async () => {
      render(
        <DeleteFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
          onSuccess={mockOnSuccess}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    expect(screen.getByText("Delete Flavor")).toBeInTheDocument()
    expect(
      screen.getByText("This action cannot be undone. The flavor will be permanently deleted.")
    ).toBeInTheDocument()

    expect(screen.getByText("Test Flavor")).toBeInTheDocument()
    expect(screen.getByText("test-flavor-id")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument() // VCPUs
    expect(screen.getByText("1024 MiB")).toBeInTheDocument() // RAM
    expect(screen.getByText("10 GiB")).toBeInTheDocument() // Disk
    expect(screen.getByText("512 MiB")).toBeInTheDocument() // Swap

    expect(screen.getByText("Delete")).toBeInTheDocument()
    expect(screen.getByText("Cancel")).toBeInTheDocument()
  })

  it("calls deleteFlavor when delete button is clicked", async () => {
    await act(async () => {
      render(
        <DeleteFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
          onSuccess={mockOnSuccess}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    const deleteButton = screen.getByText("Delete")

    await act(async () => {
      fireEvent.click(deleteButton)
    })

    expect(mockClient.compute.deleteFlavor.mutate).toHaveBeenCalledWith({
      projectId: "test-project",
      flavorId: "test-flavor-id",
    })
    expect(mockOnSuccess).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("shows error when no flavor is selected", async () => {
    await act(async () => {
      render(
        <DeleteFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={null}
          onSuccess={mockOnSuccess}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    const deleteButton = screen.getByText("Delete")

    await act(async () => {
      fireEvent.click(deleteButton)
    })

    expect(screen.getByText("No flavor selected for deletion.")).toBeInTheDocument()
    expect(mockClient.compute.deleteFlavor.mutate).not.toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it("does not render when modal is closed", () => {
    render(
      <DeleteFlavorModal
        client={mockClient}
        isOpen={false}
        onClose={mockOnClose}
        project="test-project"
        flavor={mockFlavor}
        onSuccess={mockOnSuccess}
      />,
      {
        wrapper: TestingProvider,
      }
    )

    expect(screen.queryByText("Delete Flavor")).not.toBeInTheDocument()
  })
})
