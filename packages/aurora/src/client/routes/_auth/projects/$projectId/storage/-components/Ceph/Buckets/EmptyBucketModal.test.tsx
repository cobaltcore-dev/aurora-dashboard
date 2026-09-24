import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { EmptyBucketModal } from "./EmptyBucketModal"
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

type MutationOptions = {
  onSuccess?: (deletedCount: number) => void
  onError?: (error: { message: string }) => void
  onSettled?: () => void
}

interface MockBucketState {
  isVersioningEnabled: boolean
  isEmpty: boolean
  hasOnlyDeleteMarkers: boolean
  hasOldVersionsOrDeleteMarkers: boolean
  isPartialScan: boolean
}

const { mockInvalidate, mockMutate, mockReset, mockState, mockVersioningState, mockBucketStateQuery } = vi.hoisted(
  () => {
    const mockState = {
      mutationError: null as string | null,
      isPending: false,
      capturedOptions: {} as MutationOptions,
    }
    const mockVersioningState = {
      data: { status: "Unversioned" as "Enabled" | "Suspended" | "Unversioned" },
      isLoading: false,
      error: null as { message: string } | null,
    }
    const mockBucketStateQuery = {
      data: {
        isVersioningEnabled: false,
        isEmpty: false,
        hasOnlyDeleteMarkers: false,
        hasOldVersionsOrDeleteMarkers: false,
        isPartialScan: false,
      } as MockBucketState,
      isLoading: false,
      isFetching: false,
      error: null as { message: string } | null,
    }
    const mockMutate = vi.fn().mockImplementation((_variables: unknown, options?: MutationOptions) => {
      // Merge options from both useMutation and mutate call
      const mergedOptions = { ...mockState.capturedOptions, ...options }
      if (mockState.mutationError) {
        mergedOptions.onError?.({ message: mockState.mutationError })
      } else {
        mergedOptions.onSuccess?.(5)
      }
      mergedOptions.onSettled?.()
    })
    return {
      mockInvalidate: vi.fn(),
      mockMutate,
      mockReset: vi.fn(),
      mockState,
      mockVersioningState,
      mockBucketStateQuery,
    }
  }
)

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          containers: { list: { invalidate: mockInvalidate }, getState: { invalidate: mockInvalidate } },
          objects: { list: { invalidate: mockInvalidate } },
          versioning: { checkDeletedContent: { invalidate: mockInvalidate } },
        },
      },
    }),
    storage: {
      ceph: {
        versioning: {
          getStatus: {
            useQuery: () => ({
              data: mockVersioningState.data,
              isLoading: mockVersioningState.isLoading,
              error: mockVersioningState.error,
            }),
          },
        },
        containers: {
          getState: {
            useQuery: () => ({
              data: mockBucketStateQuery.data,
              isLoading: mockBucketStateQuery.isLoading,
              isFetching: mockBucketStateQuery.isFetching,
              error: mockBucketStateQuery.error,
            }),
          },
        },
        objects: {
          deleteAll: {
            useMutation: (options: MutationOptions) => {
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
  name: "empty-bucket",
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
  bucket = mockNonEmptyBucket,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
}: {
  isOpen?: boolean
  bucket?: Bucket | null
  onClose?: () => void
  onSuccess?: (bucketName: string, deletedCount: number) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EmptyBucketModal isOpen={isOpen} bucket={bucket} onClose={onClose} onSuccess={onSuccess} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EmptyBucketModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.mutationError = null
    mockState.capturedOptions = {}
    mockState.isPending = false
    mockVersioningState.data = { status: "Unversioned" }
    mockVersioningState.isLoading = false
    mockVersioningState.error = null
    // Default to the mockNonEmptyBucket case (the default `bucket` in renderModal): the modal
    // no longer trusts bucket.count (list-cache metadata), so tests relying on a non-empty
    // bucket must reflect that via live bucket-state data instead.
    mockBucketStateQuery.data = {
      isVersioningEnabled: false,
      isEmpty: false,
      hasOnlyDeleteMarkers: false,
      hasOldVersionsOrDeleteMarkers: false,
      isPartialScan: false,
    }
    mockBucketStateQuery.isLoading = false
    mockBucketStateQuery.isFetching = false
    mockBucketStateQuery.error = null
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Empty Bucket/i)).not.toBeInTheDocument()
    })

    test("does not render when bucket is null", () => {
      renderModal({ bucket: null })
      expect(screen.queryByText(/Empty Bucket/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and bucket is provided", () => {
      renderModal()
      expect(screen.getByRole("heading", { name: "Empty Bucket" })).toBeInTheDocument()
    })
  })

  describe("Warning message", () => {
    test("shows warning message when stale metadata says empty but live check finds objects", () => {
      // bucket.count === 0 but the live bucket-state query still reports a current object
      // (stale-cache / race scenario) — the modal must fall through to the normal flow
      mockBucketStateQuery.data = { ...mockBucketStateQuery.data, isEmpty: false }
      renderModal({ bucket: mockEmptyBucket })
      expect(screen.getByText(/This action will permanently delete all objects/)).toBeInTheDocument()
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })

    test("shows same warning for non-empty bucket", () => {
      renderModal({ bucket: mockNonEmptyBucket })
      expect(screen.getByText(/This action will permanently delete all objects/)).toBeInTheDocument()
    })

    test("warning mentions that action cannot be undone", () => {
      renderModal()
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })
  })

  describe("Bucket UI", () => {
    test("renders modal title", () => {
      renderModal()
      expect(screen.getByRole("heading", { name: "Empty Bucket" })).toBeInTheDocument()
    })

    test("still shows confirmation input when metadata says empty but live check finds objects", () => {
      // bucket.count === 0 but the live bucket-state query still reports a current object
      mockBucketStateQuery.data = { ...mockBucketStateQuery.data, isEmpty: false }
      renderModal({ bucket: mockEmptyBucket })
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeInTheDocument()
    })

    test("allows emptying bucket when count is 0 but live check finds objects", () => {
      mockBucketStateQuery.data = { ...mockBucketStateQuery.data, isEmpty: false }
      renderModal({ bucket: mockEmptyBucket })
      expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).toBeInTheDocument()
    })

    test("renders confirmation input", () => {
      renderModal()
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeInTheDocument()
    })

    test("confirmation input has bucket name as placeholder", () => {
      renderModal()
      expect(screen.getByPlaceholderText(mockNonEmptyBucket.name)).toBeInTheDocument()
    })

    test("confirmation input has autofocus", () => {
      renderModal()
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toHaveFocus()
    })

    test("renders Empty button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).toBeInTheDocument()
    })

    test("renders Cancel button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("Empty button is disabled when confirmation name is empty", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).toBeDisabled()
    })
  })

  describe("Truly empty bucket (isTrulyEmpty)", () => {
    test("shows info-only view when bucket metadata and live check both report empty", () => {
      mockBucketStateQuery.data = {
        isVersioningEnabled: false,
        isEmpty: true,
        hasOnlyDeleteMarkers: false,
        hasOldVersionsOrDeleteMarkers: false,
        isPartialScan: false,
      }
      const onClose = vi.fn()
      renderModal({ bucket: mockEmptyBucket, onClose })

      expect(screen.getByText("This bucket is already empty.")).toBeInTheDocument()
      expect(screen.queryByLabelText(/Type the bucket name to confirm/i)).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /^Empty Bucket$/i })).not.toBeInTheDocument()
      expect(screen.getByTestId("empty-info-close-button")).toBeInTheDocument()
    })

    test("Close button calls onClose", async () => {
      mockBucketStateQuery.data = {
        isVersioningEnabled: false,
        isEmpty: true,
        hasOnlyDeleteMarkers: false,
        hasOldVersionsOrDeleteMarkers: false,
        isPartialScan: false,
      }
      const user = userEvent.setup({ delay: null })
      const onClose = vi.fn()
      renderModal({ bucket: mockEmptyBucket, onClose })

      await user.click(screen.getByTestId("empty-info-close-button"))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    test("falls through to normal destructive UI when live check finds objects despite stale empty metadata", () => {
      // Simulates the stale-cache/race scenario this fix targets: bucket.count/bytes say
      // empty, but the live bucket-state query still reports a current object.
      mockBucketStateQuery.data = { ...mockBucketStateQuery.data, isEmpty: false }
      renderModal({ bucket: mockEmptyBucket })

      expect(screen.queryByText("This bucket is already empty.")).not.toBeInTheDocument()
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).toBeInTheDocument()
    })

    test("does not show info-only view for a non-empty bucket", () => {
      renderModal({ bucket: mockNonEmptyBucket })

      expect(screen.queryByText("This bucket is already empty.")).not.toBeInTheDocument()
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeInTheDocument()
    })
  })

  describe("Background refetch of bucket state", () => {
    test("does not render the delete-versions branch off a stale cache entry", () => {
      // Cache already holds a "safe to delete versions" verdict (isLoading: false) but a
      // refetch is in flight — must not act on the verdict until the refetch resolves, because
      // this branch forces `includeVersionsAndDeleteMarkers: true` with no checkbox.
      mockVersioningState.data = { status: "Enabled" }
      mockBucketStateQuery.data = {
        isVersioningEnabled: true,
        isEmpty: true,
        hasOnlyDeleteMarkers: true,
        hasOldVersionsOrDeleteMarkers: true,
        isPartialScan: false,
      }
      mockBucketStateQuery.isLoading = false
      mockBucketStateQuery.isFetching = true
      renderModal({ bucket: mockEmptyBucket })

      expect(screen.getByText(/Checking Bucket Contents.../)).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Delete Versions" })).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).toBeDisabled()
    })
  })

  describe("Partial scan (isPartialScan)", () => {
    test("shows the normal destructive form — not Delete Versions, not already-empty — when the scan is partial", () => {
      // Page ceiling hit before the scan could confirm anything: isEmpty/hasOnlyDeleteMarkers
      // are technically "true" from the raw counters, but isPartialScan must veto both the
      // "Delete Versions" and "already empty" branches.
      mockVersioningState.data = { status: "Enabled" }
      mockBucketStateQuery.data = {
        isVersioningEnabled: true,
        isEmpty: true,
        hasOnlyDeleteMarkers: true,
        hasOldVersionsOrDeleteMarkers: true,
        isPartialScan: true,
      }
      renderModal({ bucket: mockEmptyBucket })

      expect(screen.getByRole("heading", { name: "Empty Bucket" })).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Delete Versions" })).not.toBeInTheDocument()
      expect(screen.queryByText("This bucket is already empty.")).not.toBeInTheDocument()
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).toBeInTheDocument()
    })

    test("shows the Delete Versions branch when the scan is complete and only delete markers remain", async () => {
      mockVersioningState.data = { status: "Enabled" }
      mockBucketStateQuery.data = {
        isVersioningEnabled: true,
        isEmpty: true,
        hasOnlyDeleteMarkers: true,
        hasOldVersionsOrDeleteMarkers: true,
        isPartialScan: false,
      }
      const user = userEvent.setup({ delay: null })
      renderModal({ bucket: mockEmptyBucket })

      expect(screen.getByRole("heading", { name: "Delete Versions" })).toBeInTheDocument()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockEmptyBucket.name)

      const deleteVersionsButton = screen.getByRole("button", { name: /^Delete Versions$/i })
      await user.click(deleteVersionsButton)

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ includeVersionsAndDeleteMarkers: true }),
          expect.anything()
        )
      })
    })
  })

  describe("Bucket state query error", () => {
    test("shows an accessible error message when the bucket-state query fails", () => {
      mockBucketStateQuery.error = { message: "boom" }
      renderModal({ bucket: mockNonEmptyBucket })

      const errorMessage = screen.getAllByTestId("empty-bucket-state-error")[0]
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveAttribute("role", "alert")
      expect(errorMessage).toHaveAttribute("aria-live", "assertive")
    })
  })

  describe("Name confirmation validation", () => {
    test("Empty button disabled when name does not match", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, "wrong-name")

      expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).toBeDisabled()
    })

    test("enables Empty button when name matches exactly", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      await waitFor(
        () => {
          expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).not.toBeDisabled()
        },
        { timeout: 3000 }
      )
    })

    test("trims whitespace from confirmation name", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, `  ${mockNonEmptyBucket.name}  `)

      await waitFor(
        () => {
          expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).not.toBeDisabled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe("Bucket emptying", () => {
    test("calls mutation with correct parameters", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      const emptyButton = screen.getByRole("button", { name: /^Empty Bucket$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockMutate).toHaveBeenCalledWith(
            {
              project_id: mockProjectId,
              containerName: mockNonEmptyBucket.name,
              includeVersionsAndDeleteMarkers: false,
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

    test("disables input and button while emptying", () => {
      mockState.isPending = true
      renderModal()

      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeDisabled()
      expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).toBeDisabled()
    })
  })

  describe("Success handling", () => {
    test("calls onSuccess with bucket name and deleted count", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSuccess = vi.fn()
      renderModal({ onSuccess: mockOnSuccess })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      const emptyButton = screen.getByRole("button", { name: /^Empty Bucket$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalledWith(mockNonEmptyBucket.name, 5)
        },
        { timeout: 3000 }
      )
    })

    test("invalidates every bucket-scoped query on success, deleted-content indicators included", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      const emptyButton = screen.getByRole("button", { name: /^Empty Bucket$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          // objects.list, containers.list, containers.getState, versioning.checkDeletedContent.
          // The fourth matters here: emptying a bucket removes its delete markers, which is
          // exactly what the deleted-content indicators report.
          expect(mockInvalidate).toHaveBeenCalledTimes(4)
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
      await user.type(input, mockNonEmptyBucket.name)

      const emptyButton = screen.getByRole("button", { name: /^Empty Bucket$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockOnClose).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )
    })
  })

  describe("Error handling", () => {
    test("reports a failed wipe inside the still-open modal", async () => {
      // The report used to leave through `onError` and land in a transient toast while the modal
      // closed underneath it. An operation error that the user may need to act on belongs inline
      // (B.16), so it now renders in the modal the action was started from.
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      mockState.mutationError = "Failed to empty bucket"
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)
      await user.click(screen.getByRole("button", { name: /^Empty Bucket$/i }))

      await waitFor(() => {
        expect(screen.getByTestId("empty-bucket-error")).toHaveTextContent("Failed to empty bucket")
      })
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    test("the failure Message is an accessible live region", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.mutationError = "Empty failed"
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)
      await user.click(screen.getByRole("button", { name: /^Empty Bucket$/i }))

      await waitFor(() => {
        const message = screen.getByTestId("empty-bucket-error")
        expect(message).toHaveAttribute("role", "alert")
        expect(message).toHaveAttribute("aria-live", "assertive")
      })
    })

    test("clears a previous failure when the confirmation field is edited", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.mutationError = "Empty failed"
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)
      await user.click(screen.getByRole("button", { name: /^Empty Bucket$/i }))
      await waitFor(() => expect(screen.getByTestId("empty-bucket-error")).toBeInTheDocument())

      await user.type(input, "x")

      expect(screen.queryByTestId("empty-bucket-error")).not.toBeInTheDocument()
    })

    test("keeps the failure report visible while its own invalidation refetches bucket state", async () => {
      // `onSettled` invalidates `containers.getState`, this modal is an active observer of it,
      // so a refetch starts the instant the failure is recorded. Folding `isFetching` into the
      // loading gate unconditionally would swap the report for a "Checking Bucket Contents..."
      // spinner the moment the user was meant to read it.
      const user = userEvent.setup({ delay: null })
      mockState.mutationError = "Failed to empty bucket"
      const { rerender } = renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)
      await user.click(screen.getByRole("button", { name: /^Empty Bucket$/i }))
      await waitFor(() => expect(screen.getByTestId("empty-bucket-error")).toBeInTheDocument())

      mockBucketStateQuery.isFetching = true
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <EmptyBucketModal isOpen bucket={mockNonEmptyBucket} onClose={vi.fn()} onSuccess={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )

      expect(screen.getByTestId("empty-bucket-error")).toBeInTheDocument()
      expect(screen.queryByText(/Checking Bucket Contents.../)).not.toBeInTheDocument()
    })

    test("keeps the failure report visible when the refetch flips the bucket to already-empty", async () => {
      // A wipe that errored partway can still have removed every object, so the refetch it
      // triggers can move the modal into the info-only branch. That branch used to render no
      // report at all, which lost the only record of the failure for good.
      const user = userEvent.setup({ delay: null })
      mockState.mutationError = "Failed to empty bucket"
      const { rerender } = renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)
      await user.click(screen.getByRole("button", { name: /^Empty Bucket$/i }))
      await waitFor(() => expect(screen.getByTestId("empty-bucket-error")).toBeInTheDocument())

      mockBucketStateQuery.data = {
        isVersioningEnabled: false,
        isEmpty: true,
        hasOnlyDeleteMarkers: false,
        hasOldVersionsOrDeleteMarkers: false,
        isPartialScan: false,
      }
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <EmptyBucketModal isOpen bucket={mockNonEmptyBucket} onClose={vi.fn()} onSuccess={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )

      expect(screen.getByText(/This bucket is already empty/)).toBeInTheDocument()
      expect(screen.getByTestId("empty-bucket-error")).toBeInTheDocument()
    })

    test("blocks Cancel, the close button and Esc while the wipe is in flight", async () => {
      // juno's Modal gates Esc on `closeable && closeOnEsc` and never consults the two button
      // props, so all three are needed to keep the outcome report from being discarded.
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      mockState.isPending = true
      renderModal({ onClose: mockOnClose })

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled()
      expect(screen.getByRole("button", { name: /close/i })).toBeDisabled()

      await user.keyboard("{Escape}")

      expect(mockOnClose).not.toHaveBeenCalled()
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

    test("clears copied state when modal closes", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
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
          action: "storage.ceph.bucket.empty.open",
        })
      })

      expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
    })

    test("tracks .close event when user cancels without emptying", async () => {
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
        action: "storage.ceph.bucket.empty.close",
      })
      expect(mockOnClose).toHaveBeenCalled()
    })

    test("does not track .close event on successful submit", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      // Wait for .open event
      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: "storage.ceph.bucket.empty.open" })
        )
      })

      mockOnTrackEvent.mockClear()

      // Type the bucket name to enable the Empty button
      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      // Click the Empty button
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^Empty Bucket$/i })).not.toBeDisabled()
      })

      const emptyButton = screen.getByRole("button", { name: /^Empty Bucket$/i })
      await user.click(emptyButton)

      // .close should NOT have been tracked since user submitted
      expect(mockOnTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: "storage.ceph.bucket.empty.close" })
      )
    })
  })
})
