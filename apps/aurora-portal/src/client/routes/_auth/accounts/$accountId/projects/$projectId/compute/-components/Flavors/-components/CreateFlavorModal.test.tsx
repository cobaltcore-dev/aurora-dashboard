import { render, screen, act, fireEvent } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest"
import { CreateFlavorModal } from "./CreateFlavorModal"
import { TrpcClient } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

vi.mock("@/hooks/useErrorTranslation", () => ({
  useErrorTranslation: () => ({
    translateError: vi.fn((errorCode: string) => {
      const errorMap: Record<string, string> = {
        CREATE_FLAVOR_UNAUTHORIZED: "You are not authorized to create flavors. Please log in again.",
        CREATE_FLAVOR_FORBIDDEN: "You don't have permission to create flavors in this project.",
        CREATE_FLAVOR_CONFLICT: "A flavor with this ID or name already exists. Please use different values.",
        CREATE_FLAVOR_INVALID_DATA: "The flavor data provided is invalid. Please check your input.",
        CREATE_FLAVOR_SERVER_ERROR: "Server error occurred while creating the flavor. Please try again later.",
        CREATE_FLAVOR_FAILED: "Failed to create the flavor. Please try again.",
      }
      return errorMap[errorCode] || "An unexpected error occurred. Please try again."
    }),
    isRetryableError: vi.fn(() => false),
  }),
}))

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("CreateFlavorModal", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockClient = {
    compute: {
      createFlavor: {
        mutate: vi.fn().mockResolvedValue({}),
      },
    },
  } as unknown as TrpcClient

  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the modal with all form fields", async () => {
    await act(async () => {
      render(
        <CreateFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          onSuccess={mockOnSuccess}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    expect(screen.getByLabelText("Flavor ID")).toBeInTheDocument()
    expect(screen.getByLabelText("Flavor Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Description")).toBeInTheDocument()
    expect(screen.getByLabelText("VCPUs")).toBeInTheDocument()
    expect(screen.getByLabelText("RAM (MiB)")).toBeInTheDocument()
    expect(screen.getByLabelText("Disk (GiB)")).toBeInTheDocument()
    expect(screen.getByLabelText("Ephemeral Disk (GiB)")).toBeInTheDocument()
    expect(screen.getByLabelText("Swap (MiB)")).toBeInTheDocument()
    expect(screen.getByLabelText("RX/TX Factor")).toBeInTheDocument()
  })

  it("submits the form with valid values and calls createFlavor", async () => {
    await act(async () => {
      render(
        <CreateFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          onSuccess={mockOnSuccess}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    fireEvent.change(screen.getByLabelText("Flavor ID"), { target: { value: "TestFlavor" } })
    fireEvent.change(screen.getByLabelText("Flavor Name"), { target: { value: "TestFlavor" } })
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A test flavor" } })
    fireEvent.change(screen.getByLabelText("VCPUs"), { target: { value: "4" } })
    fireEvent.change(screen.getByLabelText("RAM (MiB)"), { target: { value: "2048" } })
    fireEvent.change(screen.getByLabelText("Disk (GiB)"), { target: { value: "20" } })

    const submitButton = screen.getByText(/Create New Flavor/i)

    await act(async () => {
      fireEvent.click(submitButton)
    })

    expect(mockClient.compute.createFlavor.mutate).toHaveBeenCalledWith({
      projectId: "test-project",
      flavor: {
        id: "TestFlavor",
        name: "TestFlavor",
        description: "A test flavor",
        vcpus: 4,
        ram: 2048,
        disk: 20,
      },
    })
    expect(mockOnSuccess).toHaveBeenCalledWith("TestFlavor")
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("displays validation error messages on invalid input", async () => {
    await act(async () => {
      render(
        <CreateFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          onSuccess={mockOnSuccess}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    fireEvent.change(screen.getByLabelText("Flavor Name"), { target: { value: "T" } })
    fireEvent.blur(screen.getByLabelText("Flavor Name"))

    expect(screen.getByText("Name must be 2-50 characters long.")).toBeInTheDocument()
  })

  it("displays translated error message when creation fails", async () => {
    const mockClientWithError = {
      compute: {
        createFlavor: {
          mutate: vi.fn().mockRejectedValue(new Error("CREATE_FLAVOR_CONFLICT")),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <CreateFlavorModal
          client={mockClientWithError}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          onSuccess={mockOnSuccess}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    // Fill in required fields
    fireEvent.change(screen.getByLabelText("Flavor Name"), { target: { value: "TestFlavor" } })
    fireEvent.change(screen.getByLabelText("VCPUs"), { target: { value: "4" } })
    fireEvent.change(screen.getByLabelText("RAM (MiB)"), { target: { value: "2048" } })
    fireEvent.change(screen.getByLabelText("Disk (GiB)"), { target: { value: "20" } })

    const submitButton = screen.getByText(/Create New Flavor/i)

    await act(async () => {
      fireEvent.click(submitButton)
    })

    expect(
      screen.getByText("A flavor with this ID or name already exists. Please use different values.")
    ).toBeInTheDocument()
    expect(mockOnSuccess).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it("displays generic error message for unknown error codes", async () => {
    const mockClientWithError = {
      compute: {
        createFlavor: {
          mutate: vi.fn().mockRejectedValue(new Error("UNKNOWN_ERROR")),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <CreateFlavorModal
          client={mockClientWithError}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          onSuccess={mockOnSuccess}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    fireEvent.change(screen.getByLabelText("Flavor Name"), { target: { value: "TestFlavor" } })
    fireEvent.change(screen.getByLabelText("VCPUs"), { target: { value: "4" } })
    fireEvent.change(screen.getByLabelText("RAM (MiB)"), { target: { value: "2048" } })
    fireEvent.change(screen.getByLabelText("Disk (GiB)"), { target: { value: "20" } })

    const submitButton = screen.getByText(/Create New Flavor/i)

    await act(async () => {
      fireEvent.click(submitButton)
    })

    expect(screen.getByText("An unexpected error occurred. Please try again.")).toBeInTheDocument()
  })

  it("prevents submission with validation errors", async () => {
    await act(async () => {
      render(
        <CreateFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          onSuccess={mockOnSuccess}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    const submitButton = screen.getByText(/Create New Flavor/i)

    await act(async () => {
      fireEvent.click(submitButton)
    })

    expect(screen.getByText("Please fix the validation errors below.")).toBeInTheDocument()
    expect(mockClient.compute.createFlavor.mutate).not.toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })
})
