import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import userEvent from "@testing-library/user-event"
import { CopyObjectModal } from "./CopyObjectModal"

// Mock dependencies
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
              mutate: mockMutate,
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
          getDetails: {
            fetch: vi.fn().mockRejectedValue(new Error("Not found")),
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
            getDetails: {
              fetch: vi.fn(),
            },
          },
        },
      },
    }),
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = (props: React.ComponentProps<typeof CopyObjectModal>) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CopyObjectModal {...props} />
      </PortalProvider>
    </I18nProvider>
  )

describe("CopyObjectModal", () => {
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

  it("renders modal with title and source info", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Copy object:")).toBeInTheDocument()
    expect(screen.getByText("test-file.txt")).toBeInTheDocument()
    expect(screen.getByText("Source:")).toBeInTheDocument()
    expect(screen.getByText("source-bucket/test-file.txt")).toBeInTheDocument()
  })

  it("displays object size", () => {
    renderModal(defaultProps)

    expect(screen.getByText("2.00 KB")).toBeInTheDocument()
  })

  it("shows target bucket selection", () => {
    renderModal(defaultProps)

    expect(screen.getByLabelText("Target bucket")).toBeInTheDocument()
  })

  it("shows folder browser", () => {
    renderModal(defaultProps)

    expect(screen.getByText("Select destination folder")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /new folder/i })).toBeInTheDocument()
  })

  it("shows target path preview", () => {
    renderModal(defaultProps)

    expect(screen.getByLabelText("Target path")).toBeInTheDocument()
    expect(screen.getByDisplayValue("source-bucket/test-file.txt")).toBeInTheDocument()
  })

  it("shows copy metadata checkbox", () => {
    renderModal(defaultProps)

    const checkbox = screen.getByRole("checkbox", { name: /copy metadata/i })
    expect(checkbox).toBeChecked()
  })

  it("allows toggling copy metadata", async () => {
    const user = userEvent.setup()
    renderModal(defaultProps)

    const checkbox = screen.getByRole("checkbox", { name: /copy metadata/i })
    await user.click(checkbox)

    expect(checkbox).not.toBeChecked()
  })

  it("has New Folder button", () => {
    renderModal(defaultProps)

    expect(screen.getByRole("button", { name: /new folder/i })).toBeInTheDocument()
  })

  it("disables Copy button when destination is unchanged", () => {
    renderModal(defaultProps)

    const copyButton = screen.getByRole("button", { name: "Copy" })
    expect(copyButton).toBeDisabled()
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

    expect(screen.queryByText("Copy object:")).not.toBeInTheDocument()
  })

  it("handles objects with nested paths", () => {
    renderModal({ ...defaultProps, objectKey: "documents/reports/file.pdf" })

    expect(screen.getByText("file.pdf")).toBeInTheDocument()
    expect(screen.getByText("source-bucket/documents/reports/file.pdf")).toBeInTheDocument()
  })
})
