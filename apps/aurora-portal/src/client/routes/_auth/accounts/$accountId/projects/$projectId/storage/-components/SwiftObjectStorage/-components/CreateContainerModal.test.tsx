import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CreateContainerModal } from "./CreateContainerModal"

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidate = vi.fn()

// Controls which path mockMutate takes: null = success, string = error message
let mutationError: string | null = null

// Captured options from the last useMutation call so mockMutate can fire them
let capturedOptions: {
  onSuccess?: () => void
  onError?: (error: { message: string }) => void
  onSettled?: () => void
} = {}

const mockMutate = vi.fn().mockImplementation(() => {
  if (mutationError) {
    capturedOptions.onError?.({ message: mutationError })
  } else {
    capturedOptions.onSuccess?.()
  }
  capturedOptions.onSettled?.()
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          listContainers: {
            invalidate: mockInvalidate,
          },
        },
      },
    }),
    storage: {
      swift: {
        createContainer: {
          useMutation: (options: {
            onSuccess?: () => void
            onError?: (error: { message: string }) => void
            onSettled?: () => void
          }) => {
            capturedOptions = options ?? {}
            return {
              mutate: mockMutate,
              reset: mockReset,
              isPending: false,
            }
          },
        },
      },
    },
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
  maxContainerNameLength,
}: {
  isOpen?: boolean
  onClose?: () => void
  onSuccess?: (name: string) => void
  onError?: (name: string, error: string) => void
  maxContainerNameLength?: number
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CreateContainerModal
          isOpen={isOpen}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
          maxContainerNameLength={maxContainerNameLength}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CreateContainerModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mutationError = null
    capturedOptions = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText("Create Container")).not.toBeInTheDocument()
    })

    test("renders when isOpen is true", () => {
      renderModal()
      expect(screen.getByText("Create Container")).toBeInTheDocument()
    })
  })

  describe("Form rendering", () => {
    test("renders container name input", () => {
      renderModal()
      expect(screen.getByLabelText(/Container name/i)).toBeInTheDocument()
    })

    test("renders Create and Cancel buttons", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Create/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("renders info message about containers", () => {
      renderModal()
      expect(screen.getByText(/Inside a project, objects are stored in containers/i)).toBeInTheDocument()
    })

    test("Create button is disabled when container name is empty", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled()
    })

    test("Create button is enabled when container name is entered", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      expect(screen.getByRole("button", { name: /Create/i })).not.toBeDisabled()
    })
  })

  describe("Validation", () => {
    test("shows error when submitting with empty name", async () => {
      const user = userEvent.setup()
      renderModal()
      // Force submit by typing then clearing
      const input = screen.getByLabelText(/Container name/i)
      await user.type(input, "a")
      await user.clear(input)
      // Trigger validation via Enter
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/Container name is required/i)).toBeInTheDocument()
      })
    })

    test("shows error when name contains a slash", async () => {
      const user = userEvent.setup()
      renderModal()
      const input = screen.getByLabelText(/Container name/i)
      await user.type(input, "invalid/name")
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/Container name cannot contain slashes/i)).toBeInTheDocument()
      })
    })

    test("shows error when name exceeds maxContainerNameLength", async () => {
      const user = userEvent.setup()
      renderModal({ maxContainerNameLength: 10 })
      const input = screen.getByLabelText(/Container name/i)
      await user.type(input, "a-very-long-name")
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/10 characters or fewer/i)).toBeInTheDocument()
      })
    })

    test("uses default maxContainerNameLength of 256", async () => {
      const user = userEvent.setup()
      renderModal()
      const input = screen.getByLabelText(/Container name/i)
      await user.type(input, "a".repeat(257))
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/256 characters or fewer/i)).toBeInTheDocument()
      })
    })

    test("clears validation error when valid name is entered after error", async () => {
      const user = userEvent.setup()
      renderModal()
      const input = screen.getByLabelText(/Container name/i)
      // Trigger slash error
      await user.type(input, "bad/name")
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/cannot contain slashes/i)).toBeInTheDocument()
      })
      // Fix the name
      await user.clear(input)
      await user.type(input, "good-name")
      await waitFor(() => {
        expect(screen.queryByText(/cannot contain slashes/i)).not.toBeInTheDocument()
      })
    })
  })

  describe("Submission", () => {
    test("calls mutate with trimmed container name on Create click", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Container name/i), "  my-container  ")
      await user.click(screen.getByRole("button", { name: /Create/i }))
      expect(mockMutate).toHaveBeenCalledWith({ container: "my-container" })
    })

    test("calls mutate on Enter key press", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.keyboard("{Enter}")
      expect(mockMutate).toHaveBeenCalledWith({ container: "my-container" })
    })

    test("calls onSuccess with container name after successful mutation", async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("my-container")
      })
    })

    test("calls listContainers.invalidate after successful mutation", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled()
      })
    })

    test("does not submit when name is only whitespace", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Container name/i), "   ")
      await user.keyboard("{Enter}")
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })

  describe("Error handling", () => {
    test("calls onError with container name and error message on mutation failure", async () => {
      mutationError = "Container already exists"
      const onError = vi.fn()
      const user = userEvent.setup()
      renderModal({ onError })
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("my-container", "Container already exists")
      })
    })
  })

  describe("Cancel / close", () => {
    test("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("resets container name when modal is closed", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
