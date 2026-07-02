import { describe, it, expect, vi, beforeEach } from "vitest"
import { render as rtlRender, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { CreateFolderModal } from "./CreateFolderModal"
import type { ReactNode } from "react"

// Mock hooks and trpc - use vi.hoisted for mocks used in vi.mock()
const { mockMutate, mockReset, mockInvalidate, mockOnTrackEvent } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockReset: vi.fn(),
  mockInvalidate: vi.fn(),
  mockOnTrackEvent: vi.fn(),
}))

const render = (ui: React.ReactElement) => {
  return rtlRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>,
  })
}

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
}))

vi.mock("@tanstack/react-router", () => ({
  useRouteContext: () => ({
    onTrackEvent: mockOnTrackEvent,
  }),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        objects: {
          list: {
            useQuery: vi.fn(() => ({
              data: { folders: [], objects: [] },
              isLoading: false,
            })),
          },
          createFolder: {
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

describe("CreateFolderModal", () => {
  const defaultProps = {
    bucketName: "test-bucket",
    currentPrefix: "",
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders modal with title and input field", () => {
    render(<CreateFolderModal {...defaultProps} />)

    expect(screen.getByText("Create New Folder")).toBeInTheDocument()
    expect(screen.getByLabelText("Folder Name")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("my-folder")).toBeInTheDocument()
  })

  it("displays current location when prefix is provided", () => {
    render(<CreateFolderModal {...defaultProps} currentPrefix="documents/" />)

    expect(screen.getByText("Current location:")).toBeInTheDocument()
    expect(screen.getByText("documents/")).toBeInTheDocument()
  })

  it("updates folder name and full path preview", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} />)

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "new-folder")

    expect(input).toHaveValue("new-folder")
    expect(screen.getByText("new-folder/")).toBeInTheDocument()
  })

  it("shows full path with prefix", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} currentPrefix="docs/" />)

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "reports")

    expect(screen.getByText("docs/reports/")).toBeInTheDocument()
  })

  it("validates empty folder name", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} />)

    const createButton = screen.getByRole("button", { name: "Create Folder" })
    expect(createButton).toBeDisabled()

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "test")
    await user.clear(input)

    await waitFor(() => {
      expect(screen.getByText("Folder name is required")).toBeInTheDocument()
    })
  })

  it("validates folder name length", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} />)

    const input = screen.getByLabelText("Folder Name")
    const longName = "a".repeat(256)
    await user.type(input, longName)

    await waitFor(() => {
      expect(screen.getByText("Folder name is too long (max 255 characters)")).toBeInTheDocument()
    })
  })

  it("validates slashes in folder name", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} />)

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "folder/name")

    await waitFor(() => {
      expect(screen.getByText("Folder name cannot contain slashes")).toBeInTheDocument()
    })
  })

  it("validates leading/trailing slashes", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} />)

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "/folder/")

    await waitFor(() => {
      expect(screen.getByText("Folder name cannot contain slashes")).toBeInTheDocument()
    })
  })

  it("disables create button when validation fails", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} />)

    const createButton = screen.getByRole("button", { name: "Create Folder" })
    const input = screen.getByLabelText("Folder Name")

    await user.type(input, "valid")
    expect(createButton).not.toBeDisabled()

    await user.clear(input)
    await waitFor(() => {
      expect(createButton).toBeDisabled()
    })
  })

  it("calls mutation with correct parameters on create", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} />)

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "new-folder")

    const createButton = screen.getByRole("button", { name: "Create Folder" })
    await user.click(createButton)

    expect(mockMutate).toHaveBeenCalledWith({
      project_id: "test-project-id",
      containerName: "test-bucket",
      folderPath: "new-folder",
    })
  })

  it("includes current prefix in folder path", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} currentPrefix="docs/" />)

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "reports")

    const createButton = screen.getByRole("button", { name: "Create Folder" })
    await user.click(createButton)

    expect(mockMutate).toHaveBeenCalledWith({
      project_id: "test-project-id",
      containerName: "test-bucket",
      folderPath: "docs/reports",
    })
  })

  it("supports Enter key to submit", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} />)

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "new-folder{Enter}")

    expect(mockMutate).toHaveBeenCalled()
  })

  it("does not submit on Enter when invalid", async () => {
    const user = userEvent.setup()
    render(<CreateFolderModal {...defaultProps} />)

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "{Enter}")

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CreateFolderModal {...defaultProps} onClose={onClose} />)

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    await user.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it("resets state on close", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CreateFolderModal {...defaultProps} onClose={onClose} />)

    const input = screen.getByLabelText("Folder Name")
    await user.type(input, "test")

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    await user.click(cancelButton)

    expect(mockReset).toHaveBeenCalled()
  })

  it("does not render when isOpen is false", () => {
    render(<CreateFolderModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText("Create New Folder")).not.toBeInTheDocument()
  })

  describe("Analytics tracking", () => {
    it("tracks .open event once per modal open", async () => {
      render(<CreateFolderModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "user-action",
          action: "storage.ceph.folder.create.open",
          metadata: { accessed: true },
        })
      })

      expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
    })

    it("tracks .close event when user cancels without submitting", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<CreateFolderModal {...defaultProps} onClose={onClose} />)

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: "storage.ceph.folder.create.open" })
        )
      })

      mockOnTrackEvent.mockClear()

      const cancelButton = screen.getByRole("button", { name: "Cancel" })
      await user.click(cancelButton)

      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "user-action",
        action: "storage.ceph.folder.create.close",
        metadata: { cancelled: true },
      })
    })

    it("does not track .close event on successful submit", async () => {
      const user = userEvent.setup()
      render(<CreateFolderModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: "storage.ceph.folder.create.open" })
        )
      })

      mockOnTrackEvent.mockClear()

      const input = screen.getByLabelText("Folder Name")
      await user.type(input, "new-folder")

      const createButton = screen.getByRole("button", { name: "Create Folder" })
      await user.click(createButton)

      expect(mockOnTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: "storage.ceph.folder.create.close" })
      )
    })
  })
})
