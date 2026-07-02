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
const mockInvalidate = vi.fn()

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          versioning: { getStatus: { invalidate: mockInvalidate } },
        },
      },
    }),
    storage: {
      ceph: {
        versioning: {
          setStatus: {
            useMutation: () => ({
              mutate: mockMutate,
              reset: mockReset,
              isPending: false,
            }),
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
})
