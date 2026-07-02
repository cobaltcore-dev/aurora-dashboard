import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import userEvent from "@testing-library/user-event"
import { EditMetadataModal } from "./EditMetadataModal"

// Mock dependencies
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

const mockObjectDetails = {
  key: "test-file.txt",
  size: 1024,
  lastModified: "2024-01-15T10:30:00Z",
  contentType: "text/plain",
  etag: '"abc123def456"',
  metadata: {
    author: "John Doe",
    version: "1.0",
  },
}

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        objects: {
          updateMetadata: {
            useMutation: vi.fn(() => ({
              mutate: mockMutate,
              reset: mockReset,
              isPending: false,
              isError: false,
              error: null,
            })),
          },
          getDetails: {
            useQuery: vi.fn(() => ({
              data: mockObjectDetails,
              isLoading: false,
              isError: false,
              error: null,
            })),
          },
        },
      },
    },
    useUtils: () => ({
      storage: {
        ceph: {
          objects: {
            getDetails: {
              invalidate: mockInvalidate,
            },
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

const renderModal = (props: React.ComponentProps<typeof EditMetadataModal>) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EditMetadataModal {...props} />
      </PortalProvider>
    </I18nProvider>
  )

describe("EditMetadataModal", () => {
  const defaultProps = {
    isOpen: true,
    bucketName: "test-bucket",
    objectKey: "test-file.txt",
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders modal with title", () => {
    renderModal(defaultProps)

    expect(screen.queryByText(/Edit metadata:/i)).toBeInTheDocument()
    expect(screen.getByText("test-file.txt")).toBeInTheDocument()
  })

  it("displays object properties", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Object properties")).toBeInTheDocument()
    expect(screen.getByText("Content type")).toBeInTheDocument()
    expect(screen.getByText("text/plain")).toBeInTheDocument()
    expect(screen.getByText("ETag")).toBeInTheDocument()
    expect(screen.getByText('"abc123def456"')).toBeInTheDocument()
    expect(screen.getByText("Size")).toBeInTheDocument()
    expect(screen.getByText("1 KiB")).toBeInTheDocument()
  })

  it("displays existing metadata entries", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Metadata")).toBeInTheDocument()
    expect(screen.getByText("author")).toBeInTheDocument()
    expect(screen.getByText("John Doe")).toBeInTheDocument()
    expect(screen.getByText("version")).toBeInTheDocument()
    expect(screen.getByText("1.0")).toBeInTheDocument()
  })

  it("shows metadata size information", () => {
    renderModal(defaultProps)

    expect(screen.getByText(/bytes/)).toBeInTheDocument()
    expect(screen.getByText(/2048 bytes/)).toBeInTheDocument()
  })

  it("shows Add Property button", () => {
    renderModal(defaultProps)

    expect(screen.getByRole("button", { name: /add property/i })).toBeInTheDocument()
  })

  it("has edit and delete buttons for each metadata entry", () => {
    renderModal(defaultProps)

    // Each metadata entry has edit and delete buttons
    // There are 2 metadata entries (author, version), so expect 2 of each button
    const editButtons = screen.getAllByTitle("Edit")
    const deleteButtons = screen.getAllByTitle("Delete")

    // Filter to only count the metadata row buttons (not other UI elements)
    expect(editButtons.length).toBeGreaterThanOrEqual(2)
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2)
  })

  it("opens add property form when Add Property is clicked", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await user.click(addButton)

    expect(screen.getByPlaceholderText("property-key")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Value")).toBeInTheDocument()
  })

  it("allows adding new metadata entry", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await user.click(addButton)

    const keyInput = screen.getByPlaceholderText("property-key")
    const valueInput = screen.getByPlaceholderText("Value")

    await user.type(keyInput, "new-key")
    await user.type(valueInput, "new-value")

    const saveButtons = screen.getAllByTitle("Save")
    // The first Save button should be for the new entry being added
    await user.click(saveButtons[0])

    await waitFor(() => {
      expect(screen.getByText("new-key")).toBeInTheDocument()
      expect(screen.getByText("new-value")).toBeInTheDocument()
    })
  })

  it("allows editing metadata entry", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const editButtons = screen.getAllByTitle("Edit")
    await user.click(editButtons[0])

    const inputs = screen.getAllByDisplayValue("John Doe")
    await user.clear(inputs[0])
    await user.type(inputs[0], "Jane Smith")

    const saveButtons = screen.getAllByTitle("Save")
    // After clicking edit, the first Save button should be for the entry being edited
    await user.click(saveButtons[0])

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument()
    })
  })

  it("allows deleting metadata entry", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const deleteButtons = screen.getAllByTitle("Delete")
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.queryByText("author")).not.toBeInTheDocument()
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument()
    })
  })

  it("disables Update button when no changes", () => {
    renderModal(defaultProps)

    const updateButton = screen.getByRole("button", { name: "Update object" })
    expect(updateButton).toBeDisabled()
  })

  it("calls onClose when cancel is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ ...defaultProps, onClose })

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    await user.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it("does not render when isOpen is false", () => {
    renderModal({ ...defaultProps, isOpen: false })

    expect(screen.queryByText(/Edit metadata:/i)).not.toBeInTheDocument()
  })

  it("shows info about x-amz-meta headers", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Stored as x-amz-meta-* headers. Keys are case-insensitive.")).toBeInTheDocument()
  })

  it("allows canceling add operation", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await user.click(addButton)

    const keyInput = screen.getByPlaceholderText("property-key")
    await user.type(keyInput, "temp-key")

    const discardButtons = screen.getAllByTitle("Discard")
    await user.click(discardButtons[0])

    expect(screen.queryByPlaceholderText("property-key")).not.toBeInTheDocument()
  })

  it("allows canceling edit operation", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const editButtons = screen.getAllByTitle("Edit")
    await user.click(editButtons[0])

    const inputs = screen.getAllByDisplayValue("John Doe")
    await user.clear(inputs[0])
    await user.type(inputs[0], "Modified Value")

    const discardButtons = screen.getAllByTitle("Discard")
    await user.click(discardButtons[0])

    expect(screen.getByText("John Doe")).toBeInTheDocument()
  })

  describe("Analytics tracking", () => {
    it("tracks .open event once per modal open", async () => {
      renderModal(defaultProps)

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "user-action",
          action: "storage.ceph.object.metadata.edit.open",
          metadata: { accessed: true },
        })
      })

      expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
    })

    it("tracks .close event when user cancels without submitting", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ ...defaultProps, onClose })

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: "storage.ceph.object.metadata.edit.open" })
        )
      })

      mockOnTrackEvent.mockClear()

      const cancelButton = screen.getByRole("button", { name: "Cancel" })
      await user.click(cancelButton)

      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "user-action",
        action: "storage.ceph.object.metadata.edit.close",
        metadata: { cancelled: true },
      })
    })
  })
})
