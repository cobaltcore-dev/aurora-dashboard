import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteBucketModal } from "./DeleteBucketModal"
import type { Bucket } from "@/server/Storage/types/ceph"

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
    objectsData: { objects: [], folders: [], isTruncated: false, versions: [] } as {
      objects: unknown[]
      folders: unknown[]
      isTruncated: boolean
      versions?: unknown[]
    },
    objectsError: null as string | null,
    versioningData: { status: "Unversioned" as "Enabled" | "Suspended" | "Unversioned", mfaDelete: undefined },
    isLoadingVersioning: false,
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
        versioning: {
          getStatus: {
            useQuery: (_params: unknown, options: { enabled: boolean }) => {
              if (!options.enabled) {
                return { data: undefined, isLoading: false, error: null }
              }
              return {
                data: mockState.versioningData,
                isLoading: mockState.isLoadingVersioning,
                error: null,
              }
            },
          },
        },
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

const mockEmptyBucket: Bucket = {
  name: "my-test-bucket",
  creationDate: "2024-01-15T10:00:00Z",
  count: 0,
  bytes: 0,
}

const mockNonEmptyBucket: Bucket = {
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
  bucket?: Bucket | null
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

      expect(screen.getByText(/This bucket cannot be deleted yet/)).toBeInTheDocument()
      expect(screen.getByText(/Empty the bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Do the following to be able to delete the bucket/)).toBeInTheDocument()
    })

    test("shows same message for multiple objects", () => {
      mockState.objectsData = {
        objects: [{ key: "file1.txt" }, { key: "file2.txt" }, { key: "file3.txt" }] as never,
        folders: [],
        isTruncated: false,
      }
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.getByText(/This bucket cannot be deleted yet/)).toBeInTheDocument()
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

  describe("Versioning logic", () => {
    test("shows only 'Empty the bucket' for unversioned bucket with objects", () => {
      mockState.versioningData = { status: "Unversioned", mfaDelete: undefined }
      mockState.objectsData = {
        objects: [],
        folders: [],
        isTruncated: false,
        versions: [{ key: "folder/", versionId: "null", isLatest: true, isDeleteMarker: false }] as never,
      }
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.getByText(/This bucket cannot be deleted yet/)).toBeInTheDocument()
      expect(screen.getByText(/Empty the bucket/)).toBeInTheDocument()
      expect(screen.queryByText(/Delete all versions and delete markers/)).not.toBeInTheDocument()
    })

    test("shows both items for versioned bucket with objects and versions", () => {
      mockState.versioningData = { status: "Enabled", mfaDelete: undefined }
      mockState.objectsData = {
        objects: [{ key: "file.txt" }] as never,
        folders: [],
        isTruncated: false,
        versions: [
          { key: "file.txt", versionId: "v1", isLatest: true, isDeleteMarker: false },
          { key: "file.txt", versionId: "v2", isLatest: false, isDeleteMarker: false },
        ] as never,
      }
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.getByText(/This bucket cannot be deleted yet/)).toBeInTheDocument()
      expect(screen.getByText(/Empty the bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Delete all versions and delete markers/)).toBeInTheDocument()
    })

    test("shows only 'Delete all versions' for versioned bucket with only versions", () => {
      mockState.versioningData = { status: "Enabled", mfaDelete: undefined }
      mockState.objectsData = {
        objects: [],
        folders: [],
        isTruncated: false,
        versions: [
          { key: "file.txt", versionId: "v1", isLatest: false, isDeleteMarker: false },
          { key: "file.txt", versionId: "v2", isLatest: false, isDeleteMarker: false },
        ] as never,
      }
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.getByText(/This bucket cannot be deleted yet/)).toBeInTheDocument()
      expect(screen.queryByText(/Empty the bucket/)).not.toBeInTheDocument()
      expect(screen.getByText(/Delete all versions and delete markers/)).toBeInTheDocument()
    })

    test("shows only 'Delete all versions' for bucket with only delete markers", () => {
      mockState.versioningData = { status: "Suspended", mfaDelete: undefined }
      mockState.objectsData = {
        objects: [],
        folders: [],
        isTruncated: false,
        versions: [{ key: "file.txt", versionId: "v1", isLatest: true, isDeleteMarker: true }] as never,
      }
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.getByText(/This bucket cannot be deleted yet/)).toBeInTheDocument()
      expect(screen.queryByText(/Empty the bucket/)).not.toBeInTheDocument()
      expect(screen.getByText(/Delete all versions and delete markers/)).toBeInTheDocument()
    })

    test("allows deletion for empty unversioned bucket", () => {
      mockState.versioningData = { status: "Unversioned", mfaDelete: undefined }
      mockState.objectsData = {
        objects: [],
        folders: [],
        isTruncated: false,
        versions: [],
      }
      renderModal()

      expect(screen.queryByText(/This bucket cannot be deleted yet/)).not.toBeInTheDocument()
      expect(screen.getByText(/This action is irreversible/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeInTheDocument()
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

  describe("Analytics tracking", () => {
    beforeEach(() => {
      mockOnTrackEvent.mockClear()
    })

    test("tracks .open event when modal opens", async () => {
      renderModal()

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "modal",
          action: "storage.ceph.bucket.delete.open",
        })
      })

      expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
    })

    test("tracks .close event when user cancels without submitting", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      // Wait for .open event
      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
      })

      mockOnTrackEvent.mockClear()

      // Close the modal without submitting
      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.bucket.delete.close",
      })
      expect(mockOnClose).toHaveBeenCalled()
    })

    test("does not track .close event on successful submit", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      // Wait for .open event
      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: "storage.ceph.bucket.delete.open" })
        )
      })

      mockOnTrackEvent.mockClear()

      // Type the bucket name to confirm
      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockEmptyBucket.name)

      // Click the Delete Bucket button
      const deleteButton = screen.getByRole("button", { name: /^Delete Bucket$/i })
      await user.click(deleteButton)

      // .close should NOT have been tracked since user submitted
      expect(mockOnTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: "storage.ceph.bucket.delete.close" })
      )
    })
  })
})
