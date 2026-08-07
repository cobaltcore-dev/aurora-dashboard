import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
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
const mockDeleteMutate = vi.fn()
const mockReset = vi.fn()
const mockDeleteReset = vi.fn()
const mockInvalidate = vi.fn()
const mockOnTrackEvent = vi.fn()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedRestoreOptions: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedBulkOptions: any

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
            useMutation: vi.fn((options) => {
              capturedRestoreOptions = options
              return {
                mutate: mockMutate,
                reset: mockReset,
                isPending: false,
                error: null,
              }
            }),
          },
          listObjectVersions: {
            useQuery: vi.fn(() => ({
              data: [],
              isLoading: false,
            })),
          },
        },
        objects: {
          deleteVersionsBulk: {
            useMutation: vi.fn((options) => {
              capturedBulkOptions = options
              return {
                mutate: mockDeleteMutate,
                reset: mockDeleteReset,
                isPending: false,
                error: null,
              }
            }),
          },
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
            checkDeletedContent: {
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
    capturedRestoreOptions = undefined
    capturedBulkOptions = undefined
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

  describe("Bulk delete result handling", () => {
    it("calls onSuccess and closes when restoring a file succeeds", async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      const onClose = vi.fn()
      renderModal({ onSuccess, onClose })

      const restoreButton = screen.getByRole("button", { name: "Restore Version" })
      await user.click(restoreButton)

      act(() => {
        capturedRestoreOptions.onSuccess()
      })

      expect(onSuccess).toHaveBeenCalledWith("test-file.txt", "abc123def456")
      expect(onClose).toHaveBeenCalled()
    })

    it("calls onSuccess and closes when the folder delete-marker removal reports no errors", async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      const onClose = vi.fn()
      renderModal({ objectKey: "my-folder/", versionId: "dm-1", onSuccess, onClose })

      const restoreButton = screen.getByRole("button", { name: "Restore Folder" })
      await user.click(restoreButton)

      expect(mockDeleteMutate).toHaveBeenCalledWith({
        project_id: "test-project-id",
        containerName: "test-bucket",
        versions: [{ key: "my-folder/", versionId: "dm-1" }],
      })

      act(() => {
        capturedBulkOptions.onSuccess({
          deleted: [{ key: "my-folder/", versionId: "dm-1" }],
          errors: [],
          deletedCount: 1,
          errorCount: 0,
        })
      })

      expect(onSuccess).toHaveBeenCalledWith("my-folder/", "dm-1")
      expect(onClose).toHaveBeenCalled()
    })

    it("does not report success and shows the S3 error when the delete marker removal fails", async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      const onClose = vi.fn()
      renderModal({ objectKey: "my-folder/", versionId: "dm-1", onSuccess, onClose })

      const restoreButton = screen.getByRole("button", { name: "Restore Folder" })
      await user.click(restoreButton)

      act(() => {
        capturedBulkOptions.onSuccess({
          deleted: [],
          errors: [{ key: "my-folder/", versionId: "dm-1", code: "AccessDenied", message: "Access Denied" }],
          deletedCount: 0,
          errorCount: 1,
        })
      })

      expect(onSuccess).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByText(/my-folder\/ \(dm-1\): AccessDenied: Access Denied/)).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Restore Folder" })).toBeInTheDocument()
    })
  })
})
