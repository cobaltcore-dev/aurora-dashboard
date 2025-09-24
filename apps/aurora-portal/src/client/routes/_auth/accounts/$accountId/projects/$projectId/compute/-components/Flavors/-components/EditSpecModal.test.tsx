import { render, screen, act, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest"
import { EditSpecModal } from "./EditSpecModal"
import { TrpcClient } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { Flavor } from "@/server/Compute/types/flavor"

vi.mock("@/client/utils/useErrorTranslation", () => ({
  useErrorTranslation: () => ({
    translateError: vi.fn((errorCode: string) => {
      const errorMap: Record<string, string> = {
        CREATE_EXTRA_SPECS_CONFLICT: "This extra spec keys already exist. Please use different keys.",
        GET_EXTRA_SPECS_FAILED: "Failed to load extra specs. Please try again.",
        DELETE_EXTRA_SPEC_FAILED: "Failed to delete the extra spec. Please try again.",
      }
      return errorMap[errorCode] || "An unexpected error occurred. Please try again."
    }),
    isRetryableError: vi.fn(() => false),
  }),
}))

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("EditSpecModal", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockFlavor: Flavor = {
    id: "test-flavor-id",
    name: "Test Flavor",
    vcpus: 2,
    ram: 1024,
    disk: 10,
  }

  const mockExtraSpecs = {
    cpu: "dedicated",
    "hw:mem_page_size": "large",
    "quota:vif_outbound_average": "1000",
  }

  const mockClient = {
    compute: {
      getExtraSpecs: {
        query: vi.fn().mockResolvedValue(mockExtraSpecs),
      },
      createExtraSpecs: {
        mutate: vi.fn().mockResolvedValue({}),
      },
      deleteExtraSpec: {
        mutate: vi.fn().mockResolvedValue({}),
      },
    },
  } as unknown as TrpcClient

  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the modal with existing extra specs", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      expect(screen.getByText("Edit Extra Specs")).toBeInTheDocument()
      expect(screen.getByText("cpu")).toBeInTheDocument()
      expect(screen.getByText("dedicated")).toBeInTheDocument()
      expect(screen.getByText("hw:mem_page_size")).toBeInTheDocument()
      expect(screen.getByText("large")).toBeInTheDocument()
    })

    expect(mockClient.compute.getExtraSpecs.query).toHaveBeenCalledWith({
      projectId: "test-project",
      flavorId: "test-flavor-id",
    })
  })

  it("shows empty state when no extra specs exist", async () => {
    const mockClientEmpty = {
      compute: {
        getExtraSpecs: {
          query: vi.fn().mockResolvedValue({}),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClientEmpty}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      expect(screen.getByText('No extra specs found. Click "Add Extra Spec" to create one.')).toBeInTheDocument()
    })
  })

  it("handles error when fetching extra specs fails", async () => {
    const mockClientError = {
      compute: {
        getExtraSpecs: {
          query: vi.fn().mockRejectedValue(new Error("GET_EXTRA_SPECS_FAILED")),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClientError}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      expect(screen.getByText("Failed to load extra specs. Please try again.")).toBeInTheDocument()
    })
  })

  it("opens add spec form when Add Extra Spec button is clicked", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      const addButtons = screen.getAllByText("Add Extra Spec")
      expect(addButtons[0]).toBeInTheDocument()
    })

    const addButtons = screen.getAllByText("Add Extra Spec")
    const addButton = addButtons[0]

    await act(async () => {
      fireEvent.click(addButton)
    })

    expect(screen.getByPlaceholderText("Enter key")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Enter value")).toBeInTheDocument()
  })

  it("validates key input and shows error for invalid key", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      const addButtons = screen.getAllByText("Add Extra Spec")
      expect(addButtons[0]).toBeInTheDocument()
    })

    const addButtons = screen.getAllByText("Add Extra Spec")
    const addButton = addButtons[0]

    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("Enter key")

    // Test empty key
    await act(async () => {
      fireEvent.blur(keyInput)
    })

    expect(screen.getByText("Key is required.")).toBeInTheDocument()

    // Test duplicate key
    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "cpu" } })
      fireEvent.blur(keyInput)
    })

    expect(screen.getByText("Key already exists.")).toBeInTheDocument()
  })

  it("validates value input and shows error for empty value", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      const addButtons = screen.getAllByText("Add Extra Spec")
      expect(addButtons[0]).toBeInTheDocument()
    })

    const addButtons = screen.getAllByText("Add Extra Spec")
    const addButton = addButtons[0]

    await act(async () => {
      fireEvent.click(addButton)
    })

    const valueInput = screen.getByPlaceholderText("Enter value")

    await act(async () => {
      fireEvent.blur(valueInput)
    })

    expect(screen.getByText("Value is required.")).toBeInTheDocument()
  })

  it("successfully creates a new extra spec", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      const addButtons = screen.getAllByText("Add Extra Spec")
      expect(addButtons[0]).toBeInTheDocument()
    })

    const addButtons = screen.getAllByText("Add Extra Spec")
    const addButton = addButtons[0]

    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("Enter key")
    const valueInput = screen.getByPlaceholderText("Enter value")

    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "node" } })
      fireEvent.change(valueInput, { target: { value: "2" } })
    })

    const saveButtons = screen.getAllByTitle("Save Extra Spec")
    expect(saveButtons[0]).toBeInTheDocument()
    const saveButton = saveButtons[0]

    await act(async () => {
      fireEvent.click(saveButton)
    })

    expect(mockClient.compute.createExtraSpecs.mutate).toHaveBeenCalledWith({
      projectId: "test-project",
      flavorId: "test-flavor-id",
      extra_specs: { node: "2" },
    })

    await waitFor(() => {
      expect(screen.getByText('Extra spec "node" has been added successfully.')).toBeInTheDocument()
    })
  })

  it("handles error when creating extra spec fails", async () => {
    const mockClientError = {
      compute: {
        getExtraSpecs: {
          query: vi.fn().mockResolvedValue(mockExtraSpecs),
        },
        createExtraSpecs: {
          mutate: vi.fn().mockRejectedValue(new Error("CREATE_EXTRA_SPECS_CONFLICT")),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClientError}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      const addButtons = screen.getAllByText("Add Extra Spec")
      expect(addButtons[0]).toBeInTheDocument()
    })

    const addButtons = screen.getAllByText("Add Extra Spec")
    const addButton = addButtons[0]

    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("Enter key")
    const valueInput = screen.getByPlaceholderText("Enter value")

    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "node" } })
      fireEvent.change(valueInput, { target: { value: "2" } })
    })

    const saveButtons = screen.getAllByTitle("Save Extra Spec")
    expect(saveButtons[0]).toBeInTheDocument()
    const saveButton = saveButtons[0]

    await act(async () => {
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(screen.getByText("This extra spec keys already exist. Please use different keys.")).toBeInTheDocument()
    })
  })

  it("cancels adding new extra spec", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      const addButtons = screen.getAllByText("Add Extra Spec")
      expect(addButtons[0]).toBeInTheDocument()
    })

    const addButtons = screen.getAllByText("Add Extra Spec")
    const addButton = addButtons[0]

    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("Enter key")
    const valueInput = screen.getByPlaceholderText("Enter value")

    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "test-key" } })
      fireEvent.change(valueInput, { target: { value: "test-value" } })
    })

    const cancelButton = screen.getByRole("button", { name: /cancel/i })

    await act(async () => {
      fireEvent.click(cancelButton)
    })

    expect(screen.queryByPlaceholderText("Enter key")).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText("Enter value")).not.toBeInTheDocument()
  })

  it("successfully deletes an extra spec", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      expect(screen.getByText("cpu")).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole("button", { name: /delete cpu/i })

    await act(async () => {
      fireEvent.click(deleteButton)
    })

    expect(mockClient.compute.deleteExtraSpec.mutate).toHaveBeenCalledWith({
      projectId: "test-project",
      flavorId: "test-flavor-id",
      key: "cpu",
    })

    await waitFor(() => {
      expect(screen.getByText('Extra spec "cpu" has been deleted successfully.')).toBeInTheDocument()
    })
  })

  it("handles error when deleting extra spec fails", async () => {
    const mockClientError = {
      compute: {
        getExtraSpecs: {
          query: vi.fn().mockResolvedValue(mockExtraSpecs),
        },
        deleteExtraSpec: {
          mutate: vi.fn().mockRejectedValue(new Error("DELETE_EXTRA_SPEC_FAILED")),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClientError}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      expect(screen.getByText("cpu")).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole("button", { name: /delete cpu/i })

    await act(async () => {
      fireEvent.click(deleteButton)
    })

    await waitFor(() => {
      expect(screen.getByText("Failed to delete the extra spec. Please try again.")).toBeInTheDocument()
    })
  })

  it("trims whitespace from key and value inputs", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      const addButtons = screen.getAllByText("Add Extra Spec")
      expect(addButtons[0]).toBeInTheDocument()
    })

    const addButtons = screen.getAllByText("Add Extra Spec")
    const addButton = addButtons[0]

    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("Enter key")
    const valueInput = screen.getByPlaceholderText("Enter value")

    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "  node  " } })
      fireEvent.change(valueInput, { target: { value: "  2  " } })
    })

    const saveButtons = screen.getAllByTitle("Save Extra Spec")
    expect(saveButtons[0]).toBeInTheDocument()
    const saveButton = saveButtons[0]

    await act(async () => {
      fireEvent.click(saveButton)
    })

    expect(mockClient.compute.createExtraSpecs.mutate).toHaveBeenCalledWith({
      projectId: "test-project",
      flavorId: "test-flavor-id",
      extra_specs: { node: "2" },
    })
  })

  it("prevents submission with validation errors", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    await waitFor(() => {
      const addButtons = screen.getAllByText("Add Extra Spec")
      expect(addButtons[0]).toBeInTheDocument()
    })

    const addButtons = screen.getAllByText("Add Extra Spec")
    const addButton = addButtons[0]

    await act(async () => {
      fireEvent.click(addButton)
    })

    const saveButtons = screen.getAllByTitle("Save Extra Spec")
    expect(saveButtons[0]).toBeInTheDocument()
    const saveButton = saveButtons[0]

    await act(async () => {
      fireEvent.click(saveButton)
    })

    expect(screen.getByText("Please fix the validation errors below.")).toBeInTheDocument()
    expect(mockClient.compute.createExtraSpecs.mutate).not.toHaveBeenCalled()
  })

  it("handles missing flavor gracefully", async () => {
    await act(async () => {
      render(
        <EditSpecModal client={mockClient} isOpen={true} onClose={mockOnClose} project="test-project" flavor={null} />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    expect(screen.getByText("Edit Extra Specs")).toBeInTheDocument()
    expect(mockClient.compute.getExtraSpecs.query).not.toHaveBeenCalled()
  })
})
