import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import userEvent from "@testing-library/user-event"
import { ObjectVersionHistoryModal } from "./ObjectVersionHistoryModal"

// Mock hooks and trpc
vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
}))

const mockInvalidate = vi.fn()
const mockRefetch = vi.fn()
const mockOnTrackEvent = vi.fn()

const mockVersionsData = [
  {
    versionId: "version-1",
    lastModified: "2024-01-15T10:30:00Z",
    size: 1024,
    etag: '"abc123"',
    isLatest: true,
    isDeleteMarker: false,
  },
  {
    versionId: "version-2",
    lastModified: "2024-01-14T10:30:00Z",
    size: 512,
    etag: '"def456"',
    isLatest: false,
    isDeleteMarker: false,
  },
]

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
          listObjectVersions: {
            useQuery: vi.fn(() => ({
              data: mockVersionsData,
              isLoading: false,
              error: null,
              refetch: mockRefetch,
            })),
          },
          restoreVersion: {
            useMutation: vi.fn(() => ({
              mutate: vi.fn(),
              reset: vi.fn(),
              isPending: false,
            })),
          },
          deleteVersion: {
            useMutation: vi.fn(() => ({
              mutate: vi.fn(),
              reset: vi.fn(),
              isPending: false,
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

const renderModal = (props: Partial<React.ComponentProps<typeof ObjectVersionHistoryModal>> = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ObjectVersionHistoryModal {...defaultProps} {...props} />
      </PortalProvider>
    </I18nProvider>
  )

const defaultProps = {
  isOpen: true,
  bucketName: "test-bucket",
  objectKey: "test-file.txt",
  onClose: vi.fn(),
  onRestoreVersion: vi.fn(),
  onDeleteVersion: vi.fn(),
}

describe("ObjectVersionHistoryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders modal with title", () => {
    renderModal()

    // The title contains "Version History:" and the objectKey
    expect(screen.getByRole("heading", { name: /Version History:.*test-file\.txt/ })).toBeInTheDocument()
  })

  it("displays version table headers", () => {
    renderModal()

    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Version ID")).toBeInTheDocument()
    expect(screen.getByText("Last Modified")).toBeInTheDocument()
    expect(screen.getByText("Size")).toBeInTheDocument()
    expect(screen.getByText("ETag")).toBeInTheDocument()
    expect(screen.getByText("Actions")).toBeInTheDocument()
  })

  it("displays version data", () => {
    renderModal()

    expect(screen.getByText("version-1")).toBeInTheDocument()
    expect(screen.getByText("version-2")).toBeInTheDocument()
    expect(screen.getByText("Latest")).toBeInTheDocument()
    expect(screen.getByText("Older")).toBeInTheDocument()
  })

  it("calls onClose when cancel is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    // The modal has a close button in the header - get all close buttons and use the first one
    const closeButtons = screen.getAllByRole("button", { name: /close/i })
    await user.click(closeButtons[0])

    expect(onClose).toHaveBeenCalled()
  })

  it("does not render when isOpen is false", () => {
    renderModal({ isOpen: false })

    expect(screen.queryByText(/Version History:/)).not.toBeInTheDocument()
  })

  describe("Analytics tracking", () => {
    it("tracks .open event when modal opens", async () => {
      renderModal()

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "modal",
          action: "storage.ceph.object.version.history.open",
        })
      })

      expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
    })

    it("tracks .close event when user closes the modal", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: "storage.ceph.object.version.history.open" })
        )
      })

      mockOnTrackEvent.mockClear()

      // Get all close buttons and use the first one (header close button)
      const closeButtons = screen.getAllByRole("button", { name: /close/i })
      await user.click(closeButtons[0])

      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.object.version.history.close",
      })
    })
  })
})
