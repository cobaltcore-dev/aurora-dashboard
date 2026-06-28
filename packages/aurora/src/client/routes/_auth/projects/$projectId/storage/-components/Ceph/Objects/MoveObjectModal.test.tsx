import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import userEvent from "@testing-library/user-event"
import { MoveObjectModal } from "./MoveObjectModal"

// Mock dependencies
vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
}))

const mockCopyMutate = vi.fn()
const mockDeleteMutate = vi.fn()
const mockReset = vi.fn()
const mockInvalidate = vi.fn()

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        containers: {
          list: {
            useQuery: vi.fn(() => ({
              data: [{ name: "bucket-1" }, { name: "bucket-2" }],
              isLoading: false,
            })),
          },
        },
        objects: {
          copy: {
            useMutation: vi.fn(() => ({
              mutate: mockCopyMutate,
              reset: mockReset,
              isPending: false,
              isError: false,
              error: null,
            })),
          },
          delete: {
            useMutation: vi.fn(() => ({
              mutate: mockDeleteMutate,
              reset: mockReset,
              isPending: false,
              isError: false,
              error: null,
            })),
          },
          list: {
            useQuery: vi.fn(() => ({
              data: {
                objects: [],
                folders: [{ prefix: "documents/" }],
                isTruncated: false,
              },
              isLoading: false,
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

const renderModal = (props: React.ComponentProps<typeof MoveObjectModal>) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <MoveObjectModal {...props} />
      </PortalProvider>
    </I18nProvider>
  )

describe("MoveObjectModal", () => {
  const defaultProps = {
    isOpen: true,
    bucketName: "source-bucket",
    objectKey: "test-file.txt",
    objectSize: 2048,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders modal with title and object name", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Move/Rename object:")).toBeInTheDocument()
    expect(screen.getByText("test-file.txt")).toBeInTheDocument()
  })

  it("shows source and target info", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Source")).toBeInTheDocument()
    expect(screen.getByText("Target path")).toBeInTheDocument()
  })

  it("displays source object info", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Source")).toBeInTheDocument()
    const sourcePath = screen.getAllByText("source-bucket/test-file.txt")[0]
    expect(sourcePath).toBeInTheDocument()
    expect(screen.getByText("2.00 KB")).toBeInTheDocument()
  })

  it("shows new object name input", () => {
    renderModal(defaultProps)

    const input = screen.getByLabelText("New object name")
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue("test-file.txt")
  })

  it("allows changing object name", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const input = screen.getByLabelText("New object name")
    await user.clear(input)
    await user.type(input, "renamed-file.txt")

    expect(input).toHaveValue("renamed-file.txt")
  })

  it("shows target bucket selection", () => {
    renderModal(defaultProps)

    expect(screen.getByLabelText("Target bucket")).toBeInTheDocument()
  })

  it("shows folder browser", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Select destination folder within target bucket")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /new folder/i })).toBeInTheDocument()
    expect(screen.getByText("Root")).toBeInTheDocument()
  })

  it("has New Folder button", () => {
    renderModal(defaultProps)

    expect(screen.getByRole("button", { name: /new folder/i })).toBeInTheDocument()
  })

  it("disables Move button when destination is unchanged", () => {
    renderModal(defaultProps)

    const moveButton = screen.getByRole("button", { name: "Move/Rename" })
    expect(moveButton).toBeDisabled()
  })

  it("shows error message when destination is unchanged", () => {
    renderModal(defaultProps)

    expect(
      screen.getByText(
        "Cannot move to the same location. Please select a different bucket, folder, or change the name."
      )
    ).toBeInTheDocument()
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

    expect(screen.queryByText("Move/Rename object:")).not.toBeInTheDocument()
  })

  it("handles objects with nested paths", () => {
    renderModal({ ...defaultProps, objectKey: "documents/reports/file.pdf" })

    expect(screen.getByText("file.pdf")).toBeInTheDocument()
    expect(screen.getByText("source-bucket/documents/reports/file.pdf")).toBeInTheDocument()
    const input = screen.getByLabelText("New object name")
    expect(input).toHaveValue("file.pdf")
  })

  it("initializes object name from objectKey", () => {
    renderModal({ ...defaultProps, objectKey: "folder/subfolder/document.txt" })

    const input = screen.getByLabelText("New object name")
    expect(input).toHaveValue("document.txt")
  })
})
