import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteFolderModal } from "./DeleteFolderModal"
import type { FolderRow } from "./"

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidate = vi.fn()

// Controls which path mockMutate takes: null = success, string = error message
let mutationError: string | null = null
// deleteFolder returns a number (deleted object count) on success
let mutationResult = 5

// Captured options from the last useMutation call so mockMutate can fire them
let capturedOptions: {
  onSuccess?: (result: number) => void
  onError?: (error: { message: string }) => void
  onSettled?: () => void
} = {}

const mockMutate = vi.fn().mockImplementation(() => {
  if (mutationError) {
    capturedOptions.onError?.({ message: mutationError })
  } else {
    capturedOptions.onSuccess?.(mutationResult)
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
        deleteFolder: {
          useMutation: (options: {
            onSuccess?: (result: number) => void
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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockFolder: FolderRow = {
  kind: "folder",
  name: "documents/",
  displayName: "documents",
}

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  folder = mockFolder as FolderRow | null,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  folder?: FolderRow | null
  onClose?: () => void
  onSuccess?: (folderName: string, deletedCount: number) => void
  onError?: (folderName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DeleteFolderModal isOpen={isOpen} folder={folder} onClose={onClose} onSuccess={onSuccess} onError={onError} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteFolderModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mutationError = null
    mutationResult = 5
    capturedOptions = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Delete folder recursively/i)).not.toBeInTheDocument()
    })

    test("does not render when folder is null", () => {
      renderModal({ folder: null })
      expect(screen.queryByText(/Delete folder recursively/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and folder is provided", () => {
      renderModal()
      expect(screen.getByText(/Delete folder recursively/i)).toBeInTheDocument()
    })
  })

  describe("Form rendering", () => {
    test("renders Delete and Cancel buttons", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("renders warning message with folder name", () => {
      renderModal()
      expect(screen.getByText(/Are you sure\?/i)).toBeInTheDocument()
      expect(screen.getByText(/documents/)).toBeInTheDocument()
      expect(screen.getByText(/permanently deleted/i)).toBeInTheDocument()
    })

    test("renders SLO/DLO segments info message", () => {
      renderModal()
      expect(screen.getByText(/static and dynamic large objects/i)).toBeInTheDocument()
      expect(screen.getByText(/only the manifests are deleted/i)).toBeInTheDocument()
    })

    test("Delete button is enabled when not pending", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Delete$/i })).not.toBeDisabled()
    })
  })

  describe("Submission", () => {
    test("calls mutate with correct arguments on Delete click", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(mockMutate).toHaveBeenCalledWith({
        container: "test-container",
        folderPath: "documents/",
        recursive: true,
      })
    })

    test("calls onSuccess with folder display name and deleted count", async () => {
      mutationResult = 7
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("documents", 7)
      })
    })

    test("calls listObjects.invalidate after successful mutation", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled()
      })
    })

    test("calls onSuccess with 0 when folder was already empty", async () => {
      mutationResult = 0
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("documents", 0)
      })
    })
  })

  describe("Error handling", () => {
    test("calls onError with folder name and error message on mutation failure", async () => {
      mutationError = "Bulk delete failed"
      const onError = vi.fn()
      const user = userEvent.setup()
      renderModal({ onError })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("documents", "Bulk delete failed")
      })
    })

    test("does not call onSuccess when mutation fails", async () => {
      mutationError = "Internal Server Error"
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled()
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

    test("does not call mutate when Cancel is clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(mockMutate).not.toHaveBeenCalled()
    })

    test("calls onClose after successful mutation via onSettled", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    test("calls onClose after failed mutation via onSettled", async () => {
      mutationError = "Something went wrong"
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })
})
