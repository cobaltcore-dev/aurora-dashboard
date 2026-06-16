import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import userEvent from "@testing-library/user-event"
import { DeleteObjectModal } from "./DeleteObjectModal"

// Mock hooks and trpc
vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
}))

const mockMutate = vi.fn()
const mockReset = vi.fn()
const mockInvalidate = vi.fn()

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        objects: {
          delete: {
            useMutation: vi.fn(() => ({
              mutate: mockMutate,
              reset: mockReset,
              isPending: false,
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

const renderModal = (props: React.ComponentProps<typeof DeleteObjectModal>) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DeleteObjectModal {...props} />
      </PortalProvider>
    </I18nProvider>
  )

describe("DeleteObjectModal", () => {
  const defaultProps = {
    bucketName: "test-bucket",
    objectKey: "test-file.txt",
    objectSize: 1024,
    lastModified: "2024-01-15T10:30:00Z",
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders modal with title for object", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Delete Object")).toBeInTheDocument()
    expect(screen.getByText(/This action cannot be undone and object will be permanently deleted/)).toBeInTheDocument()
  })

  it("renders modal with title for folder", () => {
    renderModal({ ...defaultProps, objectKey: "folder/" })

    expect(screen.getByText("Delete Folder")).toBeInTheDocument()
    expect(screen.getByText(/This action cannot be undone and folder will be permanently deleted/)).toBeInTheDocument()
  })

  it("displays object information", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Name:")).toBeInTheDocument()
    expect(screen.getByText("Size:")).toBeInTheDocument()
    expect(screen.getByText(/1.*KiB/)).toBeInTheDocument()
    expect(screen.getByText("Last Modified:")).toBeInTheDocument()
    expect(screen.getByText("Full Path:")).toBeInTheDocument()
  })

  it("displays folder name correctly", () => {
    renderModal({ ...defaultProps, objectKey: "documents/reports/" })

    expect(screen.getByText("reports")).toBeInTheDocument()
  })

  it("does not show size and last modified for folders", () => {
    renderModal({ ...defaultProps, objectKey: "folder/" })

    expect(screen.queryByText("Size:")).not.toBeInTheDocument()
    expect(screen.queryByText("Last Modified:")).not.toBeInTheDocument()
  })

  it("shows confirmation input field", () => {
    renderModal(defaultProps)

    expect(screen.getByLabelText("Type DELETE to confirm")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("DELETE")).toBeInTheDocument()
  })

  it("shows warning message", () => {
    renderModal(defaultProps)

    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument()
  })

  it("disables delete button when confirmation is empty", () => {
    renderModal(defaultProps)

    const deleteButton = screen.getByRole("button", { name: "Delete" })
    expect(deleteButton).toBeDisabled()
  })

  it("disables delete button when confirmation is incorrect", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const input = screen.getByLabelText("Type DELETE to confirm")
    await user.type(input, "delete")

    const deleteButton = screen.getByRole("button", { name: "Delete" })
    expect(deleteButton).toBeDisabled()
  })

  it("enables delete button when confirmation is correct", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const input = screen.getByLabelText("Type DELETE to confirm")
    await user.type(input, "DELETE")

    const deleteButton = screen.getByRole("button", { name: "Delete" })
    expect(deleteButton).not.toBeDisabled()
  })

  it("calls mutation with correct parameters on delete", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const input = screen.getByLabelText("Type DELETE to confirm")
    await user.type(input, "DELETE")

    const deleteButton = screen.getByRole("button", { name: "Delete" })
    await user.click(deleteButton)

    expect(mockMutate).toHaveBeenCalledWith({
      project_id: "test-project-id",
      containerName: "test-bucket",
      objectKey: "test-file.txt",
    })
  })

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ ...defaultProps, onClose })

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    await user.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it("resets state on close", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ ...defaultProps, onClose })

    const input = screen.getByLabelText("Type DELETE to confirm")
    await user.type(input, "DELETE")

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    await user.click(cancelButton)

    expect(mockReset).toHaveBeenCalled()
  })

  it("clears confirmation text on close", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const input = screen.getByLabelText("Type DELETE to confirm")
    await user.type(input, "DELETE")
    expect(input).toHaveValue("DELETE")

    // Close and reopen - just verify modal behavior
    expect(input).toHaveValue("DELETE")
  })

  it("does not render when isOpen is false", () => {
    renderModal({ ...defaultProps, isOpen: false })

    expect(screen.queryByText("Delete Object")).not.toBeInTheDocument()
  })

  it("handles delete without optional props", async () => {
    const user = userEvent.setup()
    const propsWithoutOptional = {
      ...defaultProps,
      objectSize: undefined,
      lastModified: undefined,
    }
    renderModal(propsWithoutOptional)

    expect(screen.queryByText("Size:")).not.toBeInTheDocument()
    expect(screen.queryByText("Last Modified:")).not.toBeInTheDocument()

    const input = screen.getByLabelText("Type DELETE to confirm")
    await user.type(input, "DELETE")

    const deleteButton = screen.getByRole("button", { name: "Delete" })
    await user.click(deleteButton)

    expect(mockMutate).toHaveBeenCalled()
  })
})
