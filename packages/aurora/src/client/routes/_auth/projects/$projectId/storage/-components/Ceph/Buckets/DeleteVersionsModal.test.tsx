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

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          containers: { list: { invalidate: mockInvalidate } },
          objects: { list: { invalidate: mockInvalidate } },
        },
      },
    }),
    storage: {
      ceph: {
        objects: {
          deleteAll: {
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
  onError = vi.fn(),
}: {
  isOpen?: boolean
  bucket?: Bucket | null
  onClose?: () => void
  onSuccess?: (bucketName: string, deletedCount: number) => void
  onError?: (bucketName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DeleteVersionsModal
          isOpen={isOpen}
          bucket={bucket}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteVersionsModal - Analytics tracking", () => {
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
