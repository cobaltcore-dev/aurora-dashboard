import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { SuspendVersioningModal } from "./SuspendVersioningModal"

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
const mockInvalidateGetStatus = vi.fn()
const mockInvalidateGetState = vi.fn()
// Captured so a test can drive the real `onSuccess` the component hands to `useMutation`; the
// mutation mock below never calls it on its own.
let mockMutationOptions: { onSuccess?: () => void } = {}

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          containers: { getState: { invalidate: mockInvalidateGetState } },
          versioning: { getStatus: { invalidate: mockInvalidateGetStatus } },
        },
      },
    }),
    storage: {
      ceph: {
        versioning: {
          setStatus: {
            useMutation: (options: { onSuccess?: () => void } = {}) => {
              mockMutationOptions = options
              return { mutate: mockMutate, reset: mockReset, isPending: false }
            },
          },
        },
      },
    },
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  bucketName = "test-bucket",
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  bucketName?: string
  onClose?: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <SuspendVersioningModal
          isOpen={isOpen}
          bucketName={bucketName}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SuspendVersioningModal - Analytics tracking", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockOnTrackEvent.mockClear()
    await act(async () => {
      i18n.activate("en")
    })
  })

  test("tracks .open event when modal opens", async () => {
    renderModal()

    await waitFor(() => {
      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.bucket.versioning.suspend.open",
      })
    })

    expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
  })

  test("tracks .close event when user cancels without suspending", async () => {
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
      action: "storage.ceph.bucket.versioning.suspend.close",
    })
    expect(mockOnClose).toHaveBeenCalled()
  })

  test("does not track .close event on successful submit", async () => {
    const user = userEvent.setup({ delay: null })
    renderModal()

    // Wait for .open event
    await waitFor(() => {
      expect(mockOnTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "storage.ceph.bucket.versioning.suspend.open" })
      )
    })

    mockOnTrackEvent.mockClear()

    // Click the Suspend Versioning button
    const suspendButton = screen.getByRole("button", { name: /Suspend Versioning/i })
    await user.click(suspendButton)

    // .close should NOT have been tracked since user submitted
    expect(mockOnTrackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "storage.ceph.bucket.versioning.suspend.close" })
    )
  })
})

describe("SuspendVersioningModal - cache invalidation", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  test("refreshes both queries the versioning status is read from", async () => {
    renderModal()

    await act(async () => {
      mockMutationOptions.onSuccess?.()
    })

    expect(mockInvalidateGetStatus).toHaveBeenCalledTimes(1)
    // `useBucketInfo` reads the status from `containers.getState`, not from `getStatus`, so the
    // bucket header's badge and its Enable/Suspend menu kept the pre-mutation value when only
    // `getStatus` was invalidated - and kept it until another mutation invalidated the query, the
    // view remounted or the network reconnected: a mounted observer does not refetch on going
    // stale, and `refetchOnWindowFocus` is off globally.
    expect(mockInvalidateGetState).toHaveBeenCalledTimes(1)
  })
})
