import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteBucketModal } from "./DeleteBucketModal"
import type { Container } from "@/server/Storage/types/ceph"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── Mock clipboard API ───────────────────────────────────────────────────────

const mockWriteText = vi.fn().mockResolvedValue(undefined)

Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

// ─── tRPC mock ────────────────────────────────────────────────────────────────

type DeleteMutationOptions = {
  onSuccess?: () => void
  onError?: (error: { message: string }) => void
  onSettled?: () => void
}

const { mockInvalidate, mockMutate, mockReset, mockState } = vi.hoisted(() => {
  const mockState = {
    mutationError: null as string | null,
    isPending: false,
    isLoading: false,
    objectsData: { objects: [], folders: [], isTruncated: false },
    objectsError: null as string | null,
    capturedOptions: {} as DeleteMutationOptions,
  }
  const mockMutate = vi.fn().mockImplementation((_variables: unknown, options?: DeleteMutationOptions) => {
    // Merge options from both useMutation and mutate call
    const mergedOptions = { ...mockState.capturedOptions, ...options }
    if (mockState.mutationError) {
      mergedOptions.onError?.({ message: mockState.mutationError })
    } else {
      mergedOptions.onSuccess?.()
    }
    mergedOptions.onSettled?.()
  })
  return {
    mockInvalidate: vi.fn(),
    mockMutate,
    mockReset: vi.fn(),
    mockState,
  }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          containers: { list: { invalidate: mockInvalidate } },
        },
      },
    }),
    storage: {
      ceph: {
        objects: {
          list: {
            useQuery: (_params: unknown, options: { enabled: boolean }) => {
              if (!options.enabled) {
                return { data: undefined, isLoading: false, error: null }
              }
              return {
                data: mockState.objectsData,
                isLoading: mockState.isLoading,
                error: mockState.objectsError ? { message: mockState.objectsError } : null,
              }
            },
          },
        },
        containers: {
          delete: {
            useMutation: (options: DeleteMutationOptions) => {
              mockState.capturedOptions = options ?? {}
              return { mutate: mockMutate, isPending: mockState.isPending, reset: mockReset }
            },
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockEmptyBucket: Container = {
  name: "my-test-bucket",
  creationDate: "2024-01-15T10:00:00Z",
  count: 0,
  bytes: 0,
}

const mockNonEmptyBucket: Container = {
  name: "bucket-with-files",
  creationDate: "2024-01-15T10:00:00Z",
  count: 5,
  bytes: 1024,
}

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  bucket = mockEmptyBucket,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  bucket?: Container | null
  onClose?: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DeleteBucketModal isOpen={isOpen} bucket={bucket} onClose={onClose} onSuccess={onSuccess} onError={onError} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteBucketModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.mutationError = null
    mockState.capturedOptions = {}
    mockState.isPending = false
    mockState.isLoading = false
    mockState.objectsData = { objects: [], folders: [], isTruncated: false }
    mockState.objectsError = null
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Delete Bucket/i)).not.toBeInTheDocument()
    })

    test("does not render when bucket is null", () => {
      renderModal({ bucket: null })
      expect(screen.queryByText(/Delete Bucket/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and bucket is provided", () => {
      renderModal()
      expect(screen.getByRole("heading", { name: "Delete Bucket" })).toBeInTheDocument()
    })
  })

  describe("UI elements for empty bucket", () => {
    test("renders modal title", () => {
      renderModal()
      expect(screen.getByRole("heading", { name: "Delete Bucket" })).toBeInTheDocument()
    })

    test("renders warning message", () => {
      renderModal()
      expect(screen.getByText(/This action is irreversible/)).toBeInTheDocument()
      expect(screen.getByText(/Deleting a bucket permanently removes it/)).toBeInTheDocument()
    })

    test("displays bucket name to delete", () => {
      renderModal()
      expect(screen.getByText("Bucket to delete:")).toBeInTheDocument()
      expect(screen.getByText(mockEmptyBucket.name)).toBeInTheDocument()
    })

    test("renders confirmation input", () => {
      renderModal()
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeInTheDocument()
    })

    test("confirmation input has bucket name as placeholder", () => {
      renderModal()
      expect(screen.getByPlaceholderText(mockEmptyBucket.name)).toBeInTheDocument()
    })

    test("renders Delete Bucket button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Delete Bucket$/i })).toBeInTheDocument()
    })

    test("renders Cancel button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("renders Copy button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Copy/i })).toBeInTheDocument()
    })

    test("Delete button is disabled when confirmation name is empty", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Delete Bucket$/i })).toBeDisabled()
    })
  })

  describe("Loading state", () => {
    test("shows loading spinner when checking bucket contents", () => {
      mockState.isLoading = true
      renderModal()

      expect(screen.getByText(/Checking bucket contents.../)).toBeInTheDocument()
      // Spinner is present in the DOM
      const spinnerContainer = screen.getByText(/Checking bucket contents.../).closest(".juno-stack")
      expect(spinnerContainer).toBeInTheDocument()
    })

    test("does not show warning message while loading", () => {
      mockState.isLoading = true
      renderModal()

      expect(screen.queryByText(/This action is irreversible/)).not.toBeInTheDocument()
    })

    test("disables Delete button while loading", () => {
      mockState.isLoading = true
      renderModal()

      expect(screen.getByRole("button", { name: /^Delete Bucket$/i })).toBeDisabled()
    })
  })

  describe("Non-empty bucket", () => {
    test("shows error message when bucket contains objects", () => {
      mockState.objectsData = { objects: [{ key: "file.txt" }] as never, folders: [], isTruncated: false }
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.getByText(/This bucket contains 1 object and cannot be deleted/)).toBeInTheDocument()
      expect(screen.getByText(/Delete all objects first/)).toBeInTheDocument()
    })

    test("shows plural form for multiple objects", () => {
      mockState.objectsData = {
        objects: [{ key: "file1.txt" }, { key: "file2.txt" }, { key: "file3.txt" }] as never,
        folders: [],
        isTruncated: false,
      }
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.getByText(/This bucket contains 3 objects and cannot be deleted/)).toBeInTheDocument()
    })

    test("does not show confirmation input for non-empty bucket", () => {
      mockState.objectsData = { objects: [{ key: "file.txt" }] as never, folders: [], isTruncated: false }
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.queryByLabelText(/Type the bucket name to confirm/i)).not.toBeInTheDocument()
    })

    test("renders Close button instead of Delete Bucket button", () => {
      mockState.objectsData = { objects: [{ key: "file.txt" }] as never, folders: [], isTruncated: false }
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.getByTestId("delete-has-objects-close-button")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /^Delete Bucket$/i })).not.toBeInTheDocument()
    })

    test("calls onClose when Close is clicked", async () => {
      mockState.objectsData = { objects: [{ key: "file.txt" }] as never, folders: [], isTruncated: false }
      const onClose = vi.fn()
      const user = userEvent.setup({ delay: null })
      renderModal({ bucket: mockNonEmptyBucket, onClose })

      await user.click(screen.getByTestId("delete-has-objects-close-button"))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe("Objects query error", () => {
    test("shows error message when objects query fails", () => {
      mockState.objectsError = "Failed to fetch objects"
      renderModal()

      expect(screen.getByText(/Failed to check bucket contents:/)).toBeInTheDocument()
      expect(screen.getByText(/Failed to fetch objects/)).toBeInTheDocument()
    })

    test("disables Delete button when objects query fails", () => {
      mockState.objectsError = "Failed to fetch objects"
      renderModal()

      expect(screen.getByRole("button", { name: /^Delete Bucket$/i })).toBeDisabled()
    })
  })

  describe("Copy bucket name", () => {
    test("shows Copy button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Copy/i })).toBeInTheDocument()
    })

    test("displays bucket name in a code block", () => {
      renderModal()
      const codeBlock = screen.getByText(mockEmptyBucket.name).closest("div.font-mono")
      expect(codeBlock).toBeInTheDocument()
    })
  })

  describe("Name confirmation validation", () => {
    test("Delete button disabled when name does not match", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, "wrong-name")

      // Button should stay disabled
      expect(screen.getByRole("button", { name: /^Delete Bucket$/i })).toBeDisabled()
    })

    test("enables Delete button when name matches exactly", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockEmptyBucket.name)

      await waitFor(
        () => {
          expect(screen.getByRole("button", { name: /^Delete Bucket$/i })).not.toBeDisabled()
        },
        { timeout: 3000 }
      )
    })

    test("Delete button disabled with wrong name", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, "wrong")

      expect(screen.getByRole("button", { name: /^Delete Bucket$/i })).toBeDisabled()
    })
  })

  describe("Bucket deletion", () => {
    test("calls mutation with correct parameters", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockEmptyBucket.name)

      const deleteButton = screen.getByRole("button", { name: /^Delete Bucket$/i })
      await user.click(deleteButton)

      await waitFor(
        () => {
          expect(mockMutate).toHaveBeenCalledWith(
            {
              project_id: mockProjectId,
              bucketName: mockEmptyBucket.name,
            },
            expect.objectContaining({
              onSuccess: expect.any(Function),
              onError: expect.any(Function),
            })
          )
        },
        { timeout: 3000 }
      )
    })

    test("disables input and button while deleting", () => {
      mockState.isPending = true
      renderModal()

      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeDisabled()
      expect(screen.getByRole("button", { name: /^Delete Bucket$/i })).toBeDisabled()
    })
  })

  describe("Success handling", () => {
    test("calls onSuccess with bucket name", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSuccess = vi.fn()
      renderModal({ onSuccess: mockOnSuccess })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockEmptyBucket.name)

      const deleteButton = screen.getByRole("button", { name: /^Delete Bucket$/i })
      await user.click(deleteButton)

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalledWith(mockEmptyBucket.name)
        },
        { timeout: 3000 }
      )
    })

    test("invalidates containers query on success", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockEmptyBucket.name)

      const deleteButton = screen.getByRole("button", { name: /^Delete Bucket$/i })
      await user.click(deleteButton)

      await waitFor(
        () => {
          expect(mockInvalidate).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )
    })

    test("closes modal on success", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockEmptyBucket.name)

      const deleteButton = screen.getByRole("button", { name: /^Delete Bucket$/i })
      await user.click(deleteButton)

      await waitFor(
        () => {
          expect(mockOnClose).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )
    })
  })

  describe("Error handling", () => {
    test("calls onError with bucket name and error message", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnError = vi.fn()
      mockState.mutationError = "Bucket not found"
      renderModal({ onError: mockOnError })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockEmptyBucket.name)

      const deleteButton = screen.getByRole("button", { name: /^Delete Bucket$/i })
      await user.click(deleteButton)

      await waitFor(
        () => {
          expect(mockOnError).toHaveBeenCalledWith(mockEmptyBucket.name, "Bucket not found")
        },
        { timeout: 3000 }
      )
    })

    test("closes modal on error", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      mockState.mutationError = "Deletion failed"
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockEmptyBucket.name)

      const deleteButton = screen.getByRole("button", { name: /^Delete Bucket$/i })
      await user.click(deleteButton)

      await waitFor(
        () => {
          expect(mockOnClose).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )
    })
  })

  describe("Modal close behavior", () => {
    test("closes modal when Cancel button is clicked", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    test("resets mutation state when modal closes", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockReset).toHaveBeenCalled()
    })
  })
})
