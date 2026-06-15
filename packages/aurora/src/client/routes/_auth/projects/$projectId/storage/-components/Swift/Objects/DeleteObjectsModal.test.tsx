import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteObjectsModal } from "./DeleteObjectsModal"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

type BulkDeleteResult = {
  numberDeleted: number
  numberNotFound: number
  errors: { path: string; status: string; error: string }[]
}

type MutationOptions = {
  onSuccess?: (result: BulkDeleteResult) => void
  onError?: (error: { message: string }) => void
  onSettled?: () => void
}

const { mockReset, mockInvalidate, mockMutate, mockState } = vi.hoisted(() => {
  const mockState = {
    mutationError: null as string | null,
    mutationResult: { numberDeleted: 3, numberNotFound: 0, errors: [] } as BulkDeleteResult,
    isPending: false,
    capturedOptions: {} as MutationOptions,
  }
  const mockMutate = vi.fn().mockImplementation(() => {
    if (mockState.mutationError) {
      mockState.capturedOptions.onError?.({ message: mockState.mutationError })
    } else {
      mockState.capturedOptions.onSuccess?.(mockState.mutationResult)
    }
    mockState.capturedOptions.onSettled?.()
  })
  return { mockReset: vi.fn(), mockInvalidate: vi.fn(), mockMutate, mockState }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          listObjects: { invalidate: mockInvalidate },
        },
      },
    }),
    storage: {
      swift: {
        bulkDelete: {
          useMutation: (options: MutationOptions) => {
            mockState.capturedOptions = options ?? {}
            return { mutate: mockMutate, reset: mockReset, isPending: mockState.isPending }
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockObjectNames = ["file-a.txt", "file-b.png", "folder/report.pdf"]
const mockObjectKeys = ["file-a.txt", "file-b.png", "folder/report.pdf"]

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  objectNames = mockObjectNames,
  objectKeys = mockObjectKeys,
  container = "test-container",
  account = undefined as string | undefined,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  objectNames?: string[]
  objectKeys?: string[]
  container?: string
  account?: string
  onClose?: () => void
  onSuccess?: (numberDeleted: number) => void
  onError?: (errorMessage: string, deletedKeys: string[]) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DeleteObjectsModal
          isOpen={isOpen}
          objectNames={objectNames}
          objectKeys={objectKeys}
          container={container}
          account={account}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteObjectsModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.mutationError = null
    mockState.mutationResult = { numberDeleted: 3, numberNotFound: 0, errors: [] }
    mockState.capturedOptions = {}
    mockState.isPending = false
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Delete Objects/i)).not.toBeInTheDocument()
    })

    test("does not render when objectKeys array is empty", () => {
      renderModal({ objectNames: [], objectKeys: [] })
      expect(screen.queryByText(/Delete Objects/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and objects are provided", () => {
      renderModal()
      expect(screen.getByText("Delete Objects")).toBeInTheDocument()
    })

    test("renders with a single object", () => {
      renderModal({ objectNames: ["single.txt"], objectKeys: ["single.txt"] })
      expect(screen.getByText("Delete Object")).toBeInTheDocument()
      expect(screen.getByText("single.txt")).toBeInTheDocument()
    })

    test("title is singular for exactly one object, plural for two or more", () => {
      const { unmount } = renderModal({ objectNames: ["only.txt"], objectKeys: ["only.txt"] })
      expect(screen.getByText("Delete Object")).toBeInTheDocument()
      expect(screen.queryByText("Delete Objects")).not.toBeInTheDocument()
      unmount()
      renderModal({ objectNames: ["a.txt", "b.txt"], objectKeys: ["a.txt", "b.txt"] })
      expect(screen.getByText("Delete Objects")).toBeInTheDocument()
    })
  })

  describe("Content", () => {
    test("renders danger warning message", () => {
      renderModal()
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    })

    test("renders objects to be deleted heading with count", () => {
      renderModal()
      expect(screen.getByText(/Objects to be deleted \(3\)/i)).toBeInTheDocument()
    })

    test("renders all object names in the list", () => {
      renderModal()
      expect(screen.getByText("file-a.txt")).toBeInTheDocument()
      expect(screen.getByText("file-b.png")).toBeInTheDocument()
      expect(screen.getByText("folder/report.pdf")).toBeInTheDocument()
    })

    test("renders Delete and Cancel buttons", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("object list has scrollable container with max-h-48", () => {
      renderModal()
      const list = screen.getByText("file-a.txt").closest(".overflow-y-auto")
      expect(list).toBeInTheDocument()
      expect(list).toHaveClass("max-h-48")
    })
  })

  describe("Truncation (> 20 objects)", () => {
    test("shows only 20 object names when more than 20 are provided", () => {
      const many = Array.from({ length: 25 }, (_, i) => `file-${i}.txt`)
      renderModal({ objectNames: many, objectKeys: many })
      expect(screen.getByText("file-0.txt")).toBeInTheDocument()
      expect(screen.getByText("file-19.txt")).toBeInTheDocument()
      expect(screen.queryByText("file-20.txt")).not.toBeInTheDocument()
    })

    test("shows '... and N more' note when list is truncated", () => {
      const many = Array.from({ length: 25 }, (_, i) => `file-${i}.txt`)
      renderModal({ objectNames: many, objectKeys: many })
      expect(screen.getByText(/... and 5 more/i)).toBeInTheDocument()
    })

    test("does not show overflow note when 20 or fewer objects", () => {
      const exact = Array.from({ length: 20 }, (_, i) => `file-${i}.txt`)
      renderModal({ objectNames: exact, objectKeys: exact })
      expect(screen.queryByText(/... and/i)).not.toBeInTheDocument()
    })
  })

  describe("Pending state", () => {
    test("shows Deleting... label on confirm button while isPending", () => {
      mockState.isPending = true
      renderModal()
      expect(screen.getByRole("button", { name: /Deleting\.\.\./i })).toBeInTheDocument()
    })

    test("disables confirm button while isPending", () => {
      mockState.isPending = true
      renderModal()
      expect(screen.getByRole("button", { name: /Deleting\.\.\./i })).toBeDisabled()
    })

    test("disables cancel button while isPending", () => {
      mockState.isPending = true
      renderModal()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled()
    })

    test("shows Delete label on confirm button when not pending", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument()
    })
  })

  describe("Submission", () => {
    test("calls mutate with fully-qualified object paths on Delete click", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(mockMutate).toHaveBeenCalledWith({
        objects: ["/test-container/file-a.txt", "/test-container/file-b.png", "/test-container/folder%2Freport.pdf"],
        project_id: mockProjectId,
      })
    })

    test("includes account in mutate input when provided", async () => {
      const user = userEvent.setup()
      renderModal({ account: "AUTH_other" })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ account: "AUTH_other" }))
    })

    test("does not include account when not provided", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(mockMutate.mock.calls[0][0]).not.toHaveProperty("account")
    })

    test("calls listObjects.invalidate with container after successful mutation", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalledWith({ container: "test-container" })
      })
    })

    test("calls onSuccess with numberDeleted after successful mutation", async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(3)
      })
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

    test("calls onSuccess when errors array is empty even with numberNotFound > 0", async () => {
      mockState.mutationResult = { numberDeleted: 2, numberNotFound: 1, errors: [] }
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(2)
      })
    })
  })

  describe("Error handling", () => {
    test("calls onError with message when mutation throws", async () => {
      mockState.mutationError = "Bulk delete failed with status 500"
      const onError = vi.fn()
      const user = userEvent.setup()
      renderModal({ onError })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("Bulk delete failed with status 500", [])
      })
    })

    test("calls onError not onSuccess when mutation throws", async () => {
      mockState.mutationError = "Internal Server Error"
      const onSuccess = vi.fn()
      const onError = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess, onError })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("Internal Server Error", [])
        expect(onSuccess).not.toHaveBeenCalled()
      })
    })

    test("calls only onError with combined message in partial-success case", async () => {
      mockState.mutationResult = {
        numberDeleted: 1,
        numberNotFound: 0,
        errors: [{ path: "/test-container/file-b.png", status: "403", error: "Forbidden" }],
      }
      const onSuccess = vi.fn()
      const onError = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess, onError })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled()
        // deleted keys exclude the failed path
        expect(onError).toHaveBeenCalledWith(
          expect.stringContaining("Forbidden"),
          expect.arrayContaining(["file-a.txt", "folder/report.pdf"])
        )
      })
    })

    test("calls onError with per-path details when result contains errors", async () => {
      mockState.mutationResult = {
        numberDeleted: 1,
        numberNotFound: 0,
        errors: [{ path: "/test-container/file-b.png", status: "403", error: "Forbidden" }],
      }
      const onError = vi.fn()
      const user = userEvent.setup()
      renderModal({ onError })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1)
        const msg = onError.mock.calls[0][0] as string
        expect(msg).toContain("file-b.png")
        expect(msg).toContain("Forbidden")
      })
    })

    test("calls onClose after error via onSettled", async () => {
      mockState.mutationError = "Server error"
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  describe("Cancel / close", () => {
    test("calls onClose when Cancel is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("calls mutation.reset when Cancel is clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(mockReset).toHaveBeenCalled()
    })

    test("does not call mutate when Cancel is clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })
})
