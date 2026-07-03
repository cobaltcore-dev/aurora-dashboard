import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import userEvent from "@testing-library/user-event"
import { RestoreVersionModal } from "./RestoreVersionModal"

// Mock hooks and trpc
vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
}))

const mockMutate = vi.fn()
const mockReset = vi.fn()
const mockInvalidate = vi.fn()
const mockOnTrackEvent = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useRouteContext: () => ({
    onTrackEvent: mockOnTrackEvent,
  }),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        versioning: {
          restoreVersion: {
            useMutation: vi.fn(() => ({
              mutate: mockMutate,
              reset: mockReset,
              isPending: false,
              error: null,
            })),
          },
          listObjectVersions: {
            useQuery: vi.fn(() => ({
              data: [],
              isLoading: false,
            })),
          },
        },
        objects: {
          list: {
            useQuery: vi.fn(() => ({
              data: { objects: [], folders: [] },
              isLoading: false,
            })),
          },
        },
        containers: {
          list: {
            useQuery: vi.fn(() => ({
              data: [],
              isLoading: false,
            })),
          },
        },
      },
    },
    useUtils: () => ({
      storage: {
        ceph: {
          versioning: {
            listObjectVersions: {
              invalidate: mockInvalidate,
            },
          },
          objects: {
            list: {
              invalidate: mockInvalidate,
            },
          },
          containers: {
            list: {
              invalidate: mockInvalidate,
            },
          },
        },
      },
    }),
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = (props: Partial<React.ComponentProps<typeof RestoreVersionModal>> = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <RestoreVersionModal {...defaultProps} {...props} />
      </PortalProvider>
    </I18nProvider>
  )

const defaultProps = {
  isOpen: true,
  bucketName: "test-bucket",
  objectKey: "test-file.txt",
  versionId: "abc123def456",
  versionDate: "2024-01-15T10:30:00Z",
  versionSize: 1024,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  onError: vi.fn(),
}

describe("RestoreVersionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders modal with title", () => {
    renderModal()

    expect(screen.getByRole("heading", { name: "Restore Version" })).toBeInTheDocument()
  })

  it("displays version information", () => {
    renderModal()

    expect(screen.getByText("Object:")).toBeInTheDocument()
    expect(screen.getByText("test-file.txt")).toBeInTheDocument()
    expect(screen.getByText("Version ID:")).toBeInTheDocument()
    expect(screen.getByText("abc123def456")).toBeInTheDocument()
  })

  it("displays date when provided", () => {
    renderModal()

    expect(screen.getByText("Date:")).toBeInTheDocument()
  })

  it("displays size when provided", () => {
    renderModal()

    expect(screen.getByText("Size:")).toBeInTheDocument()
    expect(screen.getByText("1 KiB")).toBeInTheDocument()
  })

  it("shows restore explanation text", () => {
    renderModal()

    expect(
      screen.getByText("After restoring, this version's content will become the new latest version.")
    ).toBeInTheDocument()
  })

  it("has restore button enabled by default", () => {
    renderModal()

    const restoreButton = screen.getByRole("button", { name: "Restore Version" })
    expect(restoreButton).not.toBeDisabled()
  })

  it("calls onClose when cancel is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    await user.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it("does not render when isOpen is false", () => {
    renderModal({ isOpen: false })

    expect(screen.queryByText("Restore Version")).not.toBeInTheDocument()
  })

  it("calls mutation when restore is clicked", async () => {
    const user = userEvent.setup()
    renderModal()

    const restoreButton = screen.getByRole("button", { name: "Restore Version" })
    await user.click(restoreButton)

    expect(mockMutate).toHaveBeenCalledWith({
      project_id: "test-project-id",
      bucket: "test-bucket",
      key: "test-file.txt",
      versionId: "abc123def456",
    })
  })

  describe("Analytics tracking", () => {
    it("tracks .open event when modal opens", async () => {
      renderModal()

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "modal",
          action: "storage.ceph.object.version.restore.open",
        })
      })

      expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
    })

    it("tracks .close event when user cancels without restoring", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: "storage.ceph.object.version.restore.open" })
        )
      })

      mockOnTrackEvent.mockClear()

      const cancelButton = screen.getByRole("button", { name: "Cancel" })
      await user.click(cancelButton)

      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.object.version.restore.close",
      })
    })

    it("does not track .close event on successful submit", async () => {
      const user = userEvent.setup()
      renderModal()

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: "storage.ceph.object.version.restore.open" })
        )
      })

      mockOnTrackEvent.mockClear()

      // Click restore
      const restoreButton = screen.getByRole("button", { name: "Restore Version" })
      await user.click(restoreButton)

      // .close should NOT have been tracked since user submitted
      expect(mockOnTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: "storage.ceph.object.version.restore.close" })
      )
    })
  })
})
