import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteVersionsModal } from "./DeleteVersionsModal"
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

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockMutate = vi.fn()
const mockReset = vi.fn()
const mockInvalidate = vi.fn()
const mockInvalidateDeletedContent = vi.fn()
let mutationOptions: { onSettled?: () => void } = {}
const mockMutationState = { isPending: false }

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          containers: { list: { invalidate: mockInvalidate }, getState: { invalidate: mockInvalidate } },
          objects: { list: { invalidate: mockInvalidate } },
          versioning: { checkDeletedContent: { invalidate: mockInvalidateDeletedContent } },
        },
      },
    }),
    storage: {
      ceph: {
        objects: {
          deleteNonCurrentVersions: {
            // The options are captured rather than ignored so a test can fire `onSettled`,
            // which is where the modal's cache invalidation lives.
            useMutation: (options: { onSettled?: () => void }) => {
              mutationOptions = options
              return {
                mutate: mockMutate,
                reset: mockReset,
                isPending: mockMutationState.isPending,
              }
            },
          },
        },
      },
    },
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const testBucket: Bucket = {
  name: "test-bucket",
  count: 10,
  bytes: 1024,
}

const renderModal = ({
  isOpen = true,
  bucket = testBucket,
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
        <DeleteVersionsModal isOpen={isOpen} bucket={bucket} onClose={onClose} onSuccess={onSuccess} />
      </PortalProvider>
    </I18nProvider>
  )

const confirmBucketName = async (user: ReturnType<typeof userEvent.setup>) => {
  const input = screen.getByLabelText(/Type the bucket name to confirm/i)
  await user.clear(input)
  await user.type(input, testBucket.name)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteVersionsModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockOnTrackEvent.mockClear()
    mockMutationState.isPending = false
    await act(async () => {
      i18n.activate("en")
    })
  })

  test("shows copy explaining current versions are kept and deleted objects can no longer be restored", () => {
    renderModal()

    expect(screen.getByText(/current version is kept/i)).toBeInTheDocument()
    expect(screen.getByText(/can no longer be restored from the Deleted tab/i)).toBeInTheDocument()
  })

  test("calls deleteNonCurrentVersions with project_id and containerName only", async () => {
    const user = userEvent.setup({ delay: null })
    renderModal()

    await confirmBucketName(user)

    const deleteButton = screen.getByRole("button", { name: /Delete Versions/i })
    await user.click(deleteButton)

    expect(mockMutate).toHaveBeenCalledWith(
      {
        project_id: mockProjectId,
        containerName: testBucket.name,
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
  })

  test("requires the bucket name confirmation before enabling the confirm button", async () => {
    const user = userEvent.setup({ delay: null })
    renderModal()

    const deleteButton = screen.getByRole("button", { name: /Delete Versions/i })
    expect(deleteButton).toBeDisabled()

    const input = screen.getByLabelText(/Type the bucket name to confirm/i)
    await user.type(input, "wrong-name")
    expect(deleteButton).toBeDisabled()

    await confirmBucketName(user)
    expect(deleteButton).not.toBeDisabled()
  })

  test("shows a name-mismatch error and does not submit when confirmation text is wrong", async () => {
    const user = userEvent.setup({ delay: null })

    // Force-enable submission by typing then immediately submitting via Enter,
    // bypassing the disabled-button guard to exercise handleSubmit's own check.
    renderModal()
    const input = screen.getByLabelText(/Type the bucket name to confirm/i)
    await user.type(input, "wrong-name")
    await user.type(input, "{Enter}")

    expect(mockMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/Bucket name does not match/i)).toBeInTheDocument()
  })

  test("reports a partial result when some keys failed but others were deleted", async () => {
    // "Failed to Delete Versions" over a body reading "Deleted 1 version(s)" is the title
    // contradicting itself. A run that deleted something is partial, not failed.
    const user = userEvent.setup({ delay: null })
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    renderModal({ onSuccess, onClose })

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, callbacks] = mockMutate.mock.calls[0]
    act(() => {
      callbacks.onSuccess({
        errors: [{ key: "b.txt", versionId: "v2", code: "AccessDenied", message: "Access Denied" }],
        deletedCount: 1,
        errorCount: 1,
        isPartial: false,
      })
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    const outcomeMessage = screen.getByTestId("delete-versions-outcome")
    expect(outcomeMessage).toBeInTheDocument()
    expect(screen.getByText("Versions Partially Deleted")).toBeInTheDocument()
    // The dialog stays open so the report and the retry surface are both still there.
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  test("reports a plain error when nothing was deleted and keys failed", async () => {
    const user = userEvent.setup({ delay: null })
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    renderModal({ onSuccess, onClose })

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, callbacks] = mockMutate.mock.calls[0]
    act(() => {
      callbacks.onSuccess({
        errors: [{ key: "b.txt", versionId: "v2", code: "AccessDenied", message: "Access Denied" }],
        deletedCount: 0,
        errorCount: 1,
        isPartial: false,
      })
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText("Failed to Delete Versions")).toBeInTheDocument()
    expect(screen.getByTestId("delete-versions-outcome")).toHaveTextContent("b.txt")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  test("reports success when the mutation resolves with errorCount === 0", async () => {
    const user = userEvent.setup({ delay: null })
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    renderModal({ onSuccess, onClose })

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, callbacks] = mockMutate.mock.calls[0]
    act(() => {
      callbacks.onSuccess({
        errors: [],
        deletedCount: 1,
        errorCount: 0,
        isPartial: false,
      })
    })

    expect(onSuccess).toHaveBeenCalledWith(testBucket.name, 1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId("delete-versions-outcome")).not.toBeInTheDocument()
  })

  test("warns instead of reporting success when the wipe did not reach the end of the bucket", async () => {
    // A count on its own reads as "the version history is gone". It isn't: the scan stopped
    // early, so old versions may survive and the user has to run the action again. That is a
    // partial result, not a failure, so it must not borrow the error channel.
    const user = userEvent.setup({ delay: null })
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    renderModal({ onSuccess, onClose })

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, callbacks] = mockMutate.mock.calls[0]
    act(() => {
      callbacks.onSuccess({
        errors: [],
        deletedCount: 42,
        errorCount: 0,
        isPartial: true,
      })
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText("Versions Partially Deleted")).toBeInTheDocument()
    expect(screen.getByTestId("delete-versions-outcome")).toHaveTextContent(/Run Delete Versions again/)
  })

  test("keeps both the failures and the incomplete scan when a run carries each", async () => {
    // The server records a per-key error *and* sets isPartial for every key it skips
    // (NoCurrentVersion, MissingVersionId, TooManyVersions), so this combination is the
    // ordinary partial run, not a corner case. Branching on errorCount before isPartial
    // dropped the "run it again" half of the report - the half the user has to act on.
    const user = userEvent.setup({ delay: null })
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    renderModal({ onSuccess, onClose })

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, callbacks] = mockMutate.mock.calls[0]
    act(() => {
      callbacks.onSuccess({
        errors: [{ key: "b.txt", code: "NoCurrentVersion", message: "No version flagged as current" }],
        deletedCount: 12,
        errorCount: 1,
        isPartial: true,
      })
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    const outcomeMessage = screen.getByTestId("delete-versions-outcome")
    expect(outcomeMessage).toHaveTextContent("b.txt")
    expect(outcomeMessage).toHaveTextContent(/Run Delete Versions again/)
  })

  test("reports a partial result, not a failure, when nothing was deleted but the scan stopped early", async () => {
    // Zero deletions alone is not proof of a clean failure: if the scan never reached the end,
    // the bucket still has to be reprocessed, so this must not render as the error title.
    const user = userEvent.setup({ delay: null })
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    renderModal({ onSuccess, onClose })

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, callbacks] = mockMutate.mock.calls[0]
    act(() => {
      callbacks.onSuccess({
        errors: [{ key: "b.txt", code: "TooManyVersions", message: "Key has too many versions" }],
        deletedCount: 0,
        errorCount: 1,
        isPartial: true,
      })
    })

    expect(screen.queryByText("Failed to Delete Versions")).not.toBeInTheDocument()
    expect(screen.getByText("Versions Partially Deleted")).toBeInTheDocument()
  })

  test("reports a plain error when the mutation itself fails", async () => {
    const user = userEvent.setup({ delay: null })
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    renderModal({ onSuccess, onClose })

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, callbacks] = mockMutate.mock.calls[0]
    act(() => {
      callbacks.onError({ message: "Network error" })
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText("Failed to Delete Versions")).toBeInTheDocument()
    expect(screen.getByTestId("delete-versions-outcome")).toHaveTextContent("Network error")
  })

  test("keeps the Delete Versions button live after a failed run so retrying needs no extra step", async () => {
    const user = userEvent.setup({ delay: null })
    renderModal()

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, callbacks] = mockMutate.mock.calls[0]
    act(() => {
      callbacks.onError({ message: "Network error" })
    })

    expect(screen.getByRole("button", { name: /Delete Versions/i })).not.toBeDisabled()
  })

  test("the outcome Message is an accessible live region", async () => {
    const user = userEvent.setup({ delay: null })
    renderModal()

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, callbacks] = mockMutate.mock.calls[0]
    act(() => {
      callbacks.onError({ message: "Network error" })
    })

    const outcomeMessage = screen.getByTestId("delete-versions-outcome")
    expect(outcomeMessage).toHaveAttribute("role", "alert")
    expect(outcomeMessage).toHaveAttribute("aria-live", "assertive")
  })

  test("clears the previous outcome once the user resubmits", async () => {
    const user = userEvent.setup({ delay: null })
    renderModal()

    await confirmBucketName(user)
    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    const [, firstCallbacks] = mockMutate.mock.calls[0]
    act(() => {
      firstCallbacks.onError({ message: "Network error" })
    })

    expect(screen.getByTestId("delete-versions-outcome")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Delete Versions/i }))

    expect(screen.queryByTestId("delete-versions-outcome")).not.toBeInTheDocument()
  })

  test("disables Cancel and the close button while the mutation is in flight", () => {
    mockMutationState.isPending = true
    renderModal()

    expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /close/i })).toBeDisabled()
  })

  test("ignores Escape while the mutation is in flight", async () => {
    // juno's Modal gates its Esc handler on `closeable && closeOnEsc` alone - it never looks at
    // `disableCancelButton` / `disableCloseButton`. Without `closeOnEsc={!isPending}` one keypress
    // would still discard the outcome report those two props exist to protect.
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockMutationState.isPending = true
    renderModal({ onClose })

    await user.keyboard("{Escape}")

    expect(onClose).not.toHaveBeenCalled()
  })

  test("closes on Escape when no mutation is in flight", async () => {
    // The counterpart to the case above: proves the Esc path is genuinely wired up, so the test
    // above is checking a guard rather than a key that never worked here in the first place.
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    await user.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalled()
  })

  test("refreshes the deleted-content indicators, which this mutation is the biggest mover of", () => {
    // This modal permanently removes delete markers across the whole bucket, and the per-folder
    // "Deleted" tab is built from exactly those. It used to skip this invalidation, leaving the
    // tab listing folders whose deleted content had just been purged for good.
    renderModal()

    mutationOptions.onSettled?.()

    expect(mockInvalidateDeletedContent).toHaveBeenCalledTimes(1)
  })

  test("does not close the modal when the mutation settles", () => {
    // Closing used to be unconditional in `onSettled`. Now only a clean success closes the
    // modal - a failed or partial run has to stay open to report itself.
    const onClose = vi.fn()
    renderModal({ onClose })

    mutationOptions.onSettled?.()

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe("DeleteVersionsModal - Analytics tracking", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockOnTrackEvent.mockClear()
    mockMutationState.isPending = false
    await act(async () => {
      i18n.activate("en")
    })
  })

  test("tracks .open event when modal opens", async () => {
    renderModal()

    await waitFor(() => {
      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.bucket.versions.delete.open",
      })
    })

    expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
  })

  test("tracks .close event when user cancels without deleting", async () => {
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
      action: "storage.ceph.bucket.versions.delete.close",
    })
    expect(mockOnClose).toHaveBeenCalled()
  })

  // After a failed submission, `markSubmitted()` has already run, so a manual close at that
  // point correctly does not re-track `.close` - the user did submit. Not a bug, just a
  // consequence of tracking submission rather than outcome.
  test("does not track .close event on successful submit", async () => {
    const user = userEvent.setup({ delay: null })
    renderModal()

    // Wait for .open event
    await waitFor(() => {
      expect(mockOnTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "storage.ceph.bucket.versions.delete.open" })
      )
    })

    mockOnTrackEvent.mockClear()

    // Type the bucket name to confirm
    const input = screen.getByLabelText(/Type the bucket name to confirm/i)
    await user.clear(input)
    await user.type(input, testBucket.name)

    // Click the Delete Versions button
    const deleteButton = screen.getByRole("button", { name: /Delete Versions/i })
    await user.click(deleteButton)

    // .close should NOT have been tracked since user submitted
    expect(mockOnTrackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "storage.ceph.bucket.versions.delete.close" })
    )
  })
})
