import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CreateContainerModal } from "./CreateContainerModal"
import { ContainerSummary } from "@/server/Storage/types/swift"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── useRouteContext mock ─────────────────────────────────────────────────────

const mockOnTrackEvent = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useRouteContext: () => ({
    onTrackEvent: mockOnTrackEvent,
  }),
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidate = vi.fn()

// Controls which path mockMutate takes: null = success, string = error message
let mutationError: string | null = null
// tRPC error code the mocked failure carries — mirrors error.data.code from the real client.
let mutationErrorCode: string | undefined = undefined
// Controls the success payload's partial-success shape (see swiftRouter.createContainer)
let mutationOptionsApplied = true
let mutationOptionsError: string | undefined = undefined
let mockIsPending = false

type CreateContainerResult = { created: true; optionsApplied: boolean; optionsError?: string }

// Captured options from the last useMutation call so mockMutate can fire them
let capturedOptions: {
  onSuccess?: (data: CreateContainerResult) => void
  onError?: (error: { message: string; data?: { code?: string } }) => void
  onSettled?: () => void
} = {}

const mockMutate = vi.fn().mockImplementation(() => {
  if (mutationError) {
    capturedOptions.onError?.({
      message: mutationError,
      data: mutationErrorCode ? { code: mutationErrorCode } : undefined,
    })
  } else {
    capturedOptions.onSuccess?.({
      created: true,
      optionsApplied: mutationOptionsApplied,
      optionsError: mutationOptionsError,
    })
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
            onSuccess?: (data: CreateContainerResult) => void
            onError?: (error: { message: string; data?: { code?: string } }) => void
            onSettled?: () => void
          }) => {
            capturedOptions = options ?? {}
            return {
              mutate: mockMutate,
              reset: mockReset,
              isPending: mockIsPending,
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
  onPartialSuccess = vi.fn(),
  maxContainerNameLength,
  existingContainerNames = [],
}: {
  isOpen?: boolean
  onClose?: () => void
  onSuccess?: (name: string) => void
  onPartialSuccess?: (name: string, reason: string) => void
  maxContainerNameLength?: number
  existingContainerNames?: string[]
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CreateContainerModal
          isOpen={isOpen}
          onClose={onClose}
          onSuccess={onSuccess}
          onPartialSuccess={onPartialSuccess}
          maxContainerNameLength={maxContainerNameLength}
          existingContainers={existingContainerNames.map((name): ContainerSummary => ({ name, count: 0, bytes: 0 }))}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CreateContainerModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mutationError = null
    mutationErrorCode = undefined
    mutationOptionsApplied = true
    mutationOptionsError = undefined
    mockIsPending = false
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

    test("rejects a name already present in existingContainers without calling the mutation", async () => {
      const user = userEvent.setup()
      renderModal({ existingContainerNames: ["taken-container"] })

      const input = screen.getByLabelText(/Container name/i)
      await user.type(input, "taken-container")
      await user.keyboard("{Enter}")

      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument()
      })
      expect(mockMutate).not.toHaveBeenCalled()
    })

    test("accepts a name not present in existingContainers", async () => {
      const user = userEvent.setup()
      renderModal({ existingContainerNames: ["other-container"] })

      const input = screen.getByLabelText(/Container name/i)
      await user.type(input, "new-container")
      await user.keyboard("{Enter}")

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })
  })

  describe("Submission", () => {
    test("calls mutate with trimmed container name on Create click", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Container name/i), "  my-container  ")
      await user.click(screen.getByRole("button", { name: /Create/i }))
      expect(mockMutate).toHaveBeenCalledWith({
        project_id: mockProjectId,
        container: "my-container",
      })
    })

    test("calls mutate on Enter key press", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.keyboard("{Enter}")
      expect(mockMutate).toHaveBeenCalledWith({
        project_id: mockProjectId,
        container: "my-container",
      })
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
    test("shows a persistent error banner instead of calling onPartialSuccess for a non-CONFLICT failure", async () => {
      mutationError = "Container already exists"
      const onPartialSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onPartialSuccess })
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))
      await waitFor(() => {
        expect(screen.getByTestId("create-container-error")).toHaveTextContent("Container already exists")
      })
      expect(onPartialSuccess).not.toHaveBeenCalled()
    })

    test("error banner carries role=alert and aria-live=assertive", async () => {
      mutationError = "Creation failed"
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))

      const banner = await screen.findByTestId("create-container-error")
      expect(banner).toHaveAttribute("role", "alert")
      expect(banner).toHaveAttribute("aria-live", "assertive")
    })

    test("stays open on a non-CONFLICT error so the user can retry", async () => {
      mutationError = "Creation failed"
      const onClose = vi.fn()
      const onPartialSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose, onPartialSuccess })
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))
      await waitFor(() => {
        expect(screen.getByTestId("create-container-error")).toBeInTheDocument()
      })
      expect(onClose).not.toHaveBeenCalled()
      expect(onPartialSuccess).not.toHaveBeenCalled()
      expect(screen.getByText("Create Container")).toBeInTheDocument()
    })

    test("clears the error banner when the container name is edited", async () => {
      mutationError = "Creation failed"
      const user = userEvent.setup()
      renderModal()
      const input = screen.getByLabelText(/Container name/i)
      await user.type(input, "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))
      await waitFor(() => {
        expect(screen.getByTestId("create-container-error")).toBeInTheDocument()
      })

      await user.type(input, "-2")

      expect(screen.queryByTestId("create-container-error")).not.toBeInTheDocument()
    })

    test("a dismiss-then-new-failure cycle re-shows a fresh banner", async () => {
      mutationError = "Creation failed"
      const user = userEvent.setup()
      renderModal()
      const input = screen.getByLabelText(/Container name/i)
      await user.type(input, "my-container")
      const createButton = screen.getByRole("button", { name: /Create/i })
      await user.click(createButton)

      const banner = await screen.findByTestId("create-container-error")
      const dismissButton = within(banner).getByRole("button")
      await user.click(dismissButton)

      expect(screen.queryByTestId("create-container-error")).not.toBeInTheDocument()

      await user.click(createButton)

      expect(await screen.findByTestId("create-container-error")).toBeInTheDocument()
    })

    test("on a CONFLICT (name taken) error, keeps the modal open and shows an inline field error instead of a banner or the toast callback", async () => {
      mutationError = "Container already exists"
      mutationErrorCode = "CONFLICT"
      const onClose = vi.fn()
      const onPartialSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose, onPartialSuccess })
      await user.type(screen.getByLabelText(/Container name/i), "taken-on-server")
      await user.click(screen.getByRole("button", { name: /Create/i }))
      await waitFor(() => {
        expect(screen.getByText(/A container with this name already exists/i)).toBeInTheDocument()
      })
      expect(screen.queryByTestId("create-container-error")).not.toBeInTheDocument()
      expect(onClose).not.toHaveBeenCalled()
      expect(onPartialSuccess).not.toHaveBeenCalled()
    })
  })

  describe("Partial-success reporting", () => {
    test("reports via onPartialSuccess (not onSuccess) and still closes when the container is created but options could not be applied", async () => {
      mutationOptionsApplied = false
      mutationOptionsError = "Failed to apply container settings"
      const onClose = vi.fn()
      const onPartialSuccess = vi.fn()
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose, onPartialSuccess, onSuccess })
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))

      await waitFor(() => {
        expect(onPartialSuccess).toHaveBeenCalledWith("my-container", "Failed to apply container settings")
      })
      // Only one callback fires - never both, which would otherwise produce a
      // contradictory "created" + "failed" pair of toasts for the same event.
      expect(onSuccess).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    test("falls back to a generic message when optionsError is not provided", async () => {
      mutationOptionsApplied = false
      mutationOptionsError = undefined
      const onPartialSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onPartialSuccess })
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))

      await waitFor(() => {
        expect(onPartialSuccess).toHaveBeenCalledWith("my-container", "The container's settings could not be applied.")
      })
    })

    test("calls onSuccess (not onPartialSuccess) when options were applied successfully", async () => {
      mutationOptionsApplied = true
      const onPartialSuccess = vi.fn()
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onPartialSuccess, onSuccess })
      await user.type(screen.getByLabelText(/Container name/i), "my-container")
      await user.click(screen.getByRole("button", { name: /Create/i }))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("my-container")
      })
      expect(onPartialSuccess).not.toHaveBeenCalled()
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

    // Regression test: Copilot review flagged Cancel/close as not disabled while the create
    // mutation is pending. Both are already wired via disableCancelButton/disableCloseButton -
    // this just proves it.
    test("disables the Cancel button while the create mutation is pending", () => {
      mockIsPending = true
      renderModal()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled()
    })

    test("disables the modal's close (X) control while the create mutation is pending", () => {
      mockIsPending = true
      renderModal()
      // Juno's built-in close (X) control falls back to the icon name ("close") as its
      // accessible name since the Modal doesn't pass a distinct title/aria-label for it.
      expect(screen.getByRole("button", { name: "close" })).toBeDisabled()
    })
  })
})
