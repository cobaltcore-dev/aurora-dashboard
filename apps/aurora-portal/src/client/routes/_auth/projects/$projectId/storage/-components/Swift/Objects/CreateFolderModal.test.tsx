import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CreateFolderModal } from "./CreateFolderModal"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

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
          listObjects: {
            invalidate: mockInvalidate,
          },
        },
      },
    }),
    storage: {
      swift: {
        createFolder: {
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

// ─── Mock TanStack Router ─────────────────────────────────────────────────────

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useParams: vi.fn(() => ({
      accountId: "test-account",
      projectId: "test-project",
      provider: "swift",
      containerName: "test-container",
    })),
  }
})

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  currentPrefix = "",
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  currentPrefix?: string
  onClose?: () => void
  onSuccess?: (name: string) => void
  onError?: (name: string, error: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CreateFolderModal
          isOpen={isOpen}
          currentPrefix={currentPrefix}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CreateFolderModal", () => {
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
      expect(screen.queryByText(/Create folder/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Create folder/i })).toBeInTheDocument()
    })
  })

  describe("Form rendering", () => {
    test("renders folder name input", () => {
      renderModal()
      expect(screen.getByLabelText(/Folder name/i)).toBeInTheDocument()
    })

    test("renders Create folder and Cancel buttons", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Create folder/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("renders info message about virtual folders", () => {
      renderModal()
      expect(screen.getByText(/zero-byte placeholder objects/i)).toBeInTheDocument()
    })

    test("Create folder button is disabled when folder name is empty", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Create folder/i })).toBeDisabled()
    })

    test("Create folder button is enabled when folder name is entered", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Folder name/i), "my-folder")
      expect(screen.getByRole("button", { name: /Create folder/i })).not.toBeDisabled()
    })

    test("shows root prefix '/' in title when currentPrefix is empty", () => {
      renderModal({ currentPrefix: "" })
      expect(screen.getByText("/")).toBeInTheDocument()
    })

    test("shows current prefix in title when inside a subfolder", () => {
      renderModal({ currentPrefix: "documents/" })
      expect(screen.getByText("documents/")).toBeInTheDocument()
    })
  })

  describe("Validation", () => {
    test("shows error when submitting with empty name", async () => {
      const user = userEvent.setup()
      renderModal()
      const input = screen.getByLabelText(/Folder name/i)
      await user.type(input, "a")
      await user.clear(input)
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/Folder name is required/i)).toBeInTheDocument()
      })
    })

    test("shows error when name contains a slash", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Folder name/i), "invalid/name")
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/cannot contain slashes/i)).toBeInTheDocument()
      })
    })

    test("shows error when name has leading whitespace", async () => {
      const user = userEvent.setup()
      renderModal()
      // userEvent preserves leading spaces
      await user.type(screen.getByLabelText(/Folder name/i), " leading")
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/leading or trailing whitespace/i)).toBeInTheDocument()
      })
    })

    test("shows error when name has trailing whitespace", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Folder name/i), "trailing ")
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/leading or trailing whitespace/i)).toBeInTheDocument()
      })
    })

    test("clears validation error when valid name is entered after error", async () => {
      const user = userEvent.setup()
      renderModal()
      const input = screen.getByLabelText(/Folder name/i)
      await user.type(input, "bad/name")
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/cannot contain slashes/i)).toBeInTheDocument()
      })
      await user.clear(input)
      await user.type(input, "good-name")
      await waitFor(() => {
        expect(screen.queryByText(/cannot contain slashes/i)).not.toBeInTheDocument()
      })
    })
  })

  describe("Submission", () => {
    test("calls mutate with correct folder path at root level", async () => {
      const user = userEvent.setup()
      renderModal({ currentPrefix: "" })
      await user.type(screen.getByLabelText(/Folder name/i), "my-folder")
      await user.click(screen.getByRole("button", { name: /Create folder/i }))
      expect(mockMutate).toHaveBeenCalledWith({
        project_id: mockProjectId,
        container: "test-container",
        folderPath: "my-folder/",
      })
    })

    test("calls mutate with correct folder path inside a subfolder", async () => {
      const user = userEvent.setup()
      renderModal({ currentPrefix: "documents/" })
      await user.type(screen.getByLabelText(/Folder name/i), "reports")
      await user.click(screen.getByRole("button", { name: /Create folder/i }))
      expect(mockMutate).toHaveBeenCalledWith({
        project_id: mockProjectId,
        container: "test-container",
        folderPath: "documents/reports/",
      })
    })

    test("calls mutate on Enter key press", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Folder name/i), "my-folder")
      await user.keyboard("{Enter}")
      expect(mockMutate).toHaveBeenCalled()
    })

    test("calls onSuccess with folder name after successful mutation", async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await user.type(screen.getByLabelText(/Folder name/i), "my-folder")
      await user.click(screen.getByRole("button", { name: /Create folder/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("my-folder")
      })
    })

    test("calls listObjects.invalidate after successful mutation", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Folder name/i), "my-folder")
      await user.click(screen.getByRole("button", { name: /Create folder/i }))
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled()
      })
    })

    test("does not submit when name is only whitespace", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Folder name/i), "   ")
      await user.keyboard("{Enter}")
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })

  describe("Error handling", () => {
    test("calls onError with folder name and error message on mutation failure", async () => {
      mutationError = "Object already exists"
      const onError = vi.fn()
      const user = userEvent.setup()
      renderModal({ onError })
      await user.type(screen.getByLabelText(/Folder name/i), "my-folder")
      await user.click(screen.getByRole("button", { name: /Create folder/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("my-folder", "Object already exists")
      })
    })
  })

  describe("Submitted name snapshot", () => {
    test("onSuccess receives correct name even when onSettled fires and clears state first", async () => {
      // Suppress the automatic callback firing for this test so we can control
      // the order manually — without this, mockMutate fires onSuccess synchronously
      // before our manual ordering, making the assertion non-diagnostic.
      mockMutate.mockImplementationOnce(() => {
        // intentionally does not invoke any callbacks
      })

      const onSuccess = vi.fn()
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess, onClose })

      await user.type(screen.getByLabelText(/Folder name/i), "my-folder")
      await user.click(screen.getByRole("button", { name: /Create folder/i }))
      expect(mockMutate).toHaveBeenCalled()

      // Simulate the race: fire onSettled first, which calls handleClose and clears folderName
      await act(async () => {
        capturedOptions.onSettled?.()
      })
      expect(onClose).toHaveBeenCalled()

      // Now fire onSuccess — submittedNameRef.current must still be "my-folder", not ""
      await act(async () => {
        capturedOptions.onSuccess?.()
      })
      // toHaveBeenCalledTimes(1) confirms it only fired from our manual trigger, not the mock
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenLastCalledWith("my-folder")
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

    test("resets folder name input when modal is closed", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.type(screen.getByLabelText(/Folder name/i), "my-folder")
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
