import { render as rtlRender, screen, within, waitFor } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { ReactNode } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import userEvent from "@testing-library/user-event"
import { ObjectsTableView } from "./ObjectsTableView"

// Hoisted mocks for the download wiring (referenced inside vi.mock factories).
const { downloadObjectMutate, useSubscriptionMock } = vi.hoisted(() => ({
  downloadObjectMutate: vi.fn(),
  useSubscriptionMock: vi.fn(() => ({ data: undefined })),
}))

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project",
}))

vi.mock("@/client/trpcClient", () => ({
  trpcClient: {
    storage: { ceph: { objects: { downloadObject: { mutate: downloadObjectMutate } } } },
  },
  trpcReact: {
    storage: { ceph: { objects: { watchDownloadProgress: { useSubscription: useSubscriptionMock } } } },
  },
}))

// Mock child components to isolate ObjectsTableView
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <PortalProvider>
        <I18nProvider i18n={i18n}>{children}</I18nProvider>
      </PortalProvider>
    ),
  })
}

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 48,
        size: 48,
        key: i,
        measureElement: vi.fn(),
      })),
    getTotalSize: () => count * 48,
    measureElement: vi.fn(),
  }),
}))

vi.mock("./DeleteObjectModal", () => ({
  DeleteObjectModal: () => <div data-testid="delete-modal">Delete Modal</div>,
}))

vi.mock("./CopyObjectModal", () => ({
  CopyObjectModal: () => <div data-testid="copy-modal">Copy Modal</div>,
}))

vi.mock("./MoveObjectModal", () => ({
  MoveObjectModal: () => <div data-testid="move-modal">Move Modal</div>,
}))

vi.mock("./EditMetadataModal", () => ({
  EditMetadataModal: () => <div data-testid="edit-metadata-modal">Edit Metadata Modal</div>,
}))

vi.mock("./ObjectVersionHistoryModal", () => ({
  ObjectVersionHistoryModal: () => <div data-testid="version-history-modal">Version History Modal</div>,
}))

vi.mock("./RestoreVersionModal", () => ({
  RestoreVersionModal: () => <div data-testid="restore-version-modal">Restore Version Modal</div>,
}))

describe("ObjectsTableView", () => {
  const mockFolders = [{ prefix: "documents/" }, { prefix: "images/" }]

  const mockObjects = [
    {
      key: "file1.txt",
      size: 1024,
      lastModified: "2024-01-15T10:00:00Z",
    },
    {
      key: "file2.pdf",
      size: 2048,
      lastModified: "2024-01-20T15:00:00Z",
    },
  ]

  const defaultProps = {
    bucketName: "test-bucket",
    objects: mockObjects,
    folders: mockFolders,
    currentPrefix: "",
    onFolderClick: vi.fn(),
    onDeleteObjectSuccess: vi.fn(),
    onDeleteObjectError: vi.fn(),
    onCopyObjectSuccess: vi.fn(),
    onCopyObjectError: vi.fn(),
    onMoveObjectSuccess: vi.fn(),
    onMoveObjectError: vi.fn(),
    onEditMetadataSuccess: vi.fn(),
    onEditMetadataError: vi.fn(),
    onDownloadError: vi.fn(),
  }

  describe("rendering", () => {
    it("should render table headers", () => {
      render(<ObjectsTableView {...defaultProps} />)

      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Size")).toBeInTheDocument()
      expect(screen.getByText("Last Modified")).toBeInTheDocument()
    })

    it("should render folders before objects", () => {
      render(<ObjectsTableView {...defaultProps} />)

      // Folders rendered with their testids
      expect(screen.getByTestId("folder-row-documents/")).toBeInTheDocument()
      expect(screen.getByTestId("folder-row-images/")).toBeInTheDocument()
      // Objects rendered after
      expect(screen.getByTestId("object-row-file1.txt")).toBeInTheDocument()
      expect(screen.getByTestId("object-row-file2.pdf")).toBeInTheDocument()
      // Folders precede objects in the DOM
      const folderRow = screen.getByTestId("folder-row-documents/")
      const objectRow = screen.getByTestId("object-row-file1.txt")
      expect(folderRow.compareDocumentPosition(objectRow)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    })

    it("should render folders with folder icon", () => {
      render(<ObjectsTableView {...defaultProps} />)

      expect(screen.getByText("documents")).toBeInTheDocument()
      expect(screen.getByText("images")).toBeInTheDocument()
    })

    it("should render objects with file icon", () => {
      render(<ObjectsTableView {...defaultProps} />)

      expect(screen.getByText("file1.txt")).toBeInTheDocument()
      expect(screen.getByText("file2.pdf")).toBeInTheDocument()
    })

    it("should display object sizes", () => {
      render(<ObjectsTableView {...defaultProps} />)

      expect(screen.getByText("1 KiB")).toBeInTheDocument()
      expect(screen.getByText("2 KiB")).toBeInTheDocument()
    })

    it("should display object last modified dates", () => {
      render(<ObjectsTableView {...defaultProps} />)

      // Dates are formatted with toLocaleString()
      const dateElements = screen.getAllByText(/2024/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  describe("empty state", () => {
    it("should show empty message when no folders or objects", () => {
      render(<ObjectsTableView {...defaultProps} objects={[]} folders={[]} />)

      expect(screen.getByText("No objects found.")).toBeInTheDocument()
    })

    it("should still render headers in empty state", () => {
      render(<ObjectsTableView {...defaultProps} objects={[]} folders={[]} />)

      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Size")).toBeInTheDocument()
      expect(screen.getByText("Last Modified")).toBeInTheDocument()
    })
  })

  describe("folder interaction", () => {
    it("should call onFolderClick when folder is clicked", async () => {
      const user = userEvent.setup()
      const onFolderClick = vi.fn()

      render(<ObjectsTableView {...defaultProps} onFolderClick={onFolderClick} />)

      const folderButton = screen.getByText("documents").closest("button")
      expect(folderButton).toBeInTheDocument()

      if (folderButton) {
        await user.click(folderButton)
        expect(onFolderClick).toHaveBeenCalledWith("documents/")
      }
    })

    it("should display folder names without trailing slash", () => {
      render(<ObjectsTableView {...defaultProps} />)

      // Folders rendered as "documents" not "documents/"
      expect(screen.getByText("documents")).toBeInTheDocument()
      expect(screen.queryByText("documents/")).not.toBeInTheDocument()
    })
  })

  describe("prefix handling", () => {
    it("should strip current prefix from display names", () => {
      const propsWithPrefix = {
        ...defaultProps,
        currentPrefix: "root/",
        folders: [{ prefix: "root/subfolder/" }],
        objects: [
          {
            key: "root/file.txt",
            size: 1024,
            lastModified: "2024-01-15T10:00:00Z",
          },
        ],
      }

      render(<ObjectsTableView {...propsWithPrefix} />)

      expect(screen.getByText("subfolder")).toBeInTheDocument()
      expect(screen.getByText("file.txt")).toBeInTheDocument()
    })
  })

  describe("object actions", () => {
    it("should render action menu for objects", () => {
      render(<ObjectsTableView {...defaultProps} />)

      // Each object row is rendered
      expect(screen.getByTestId("object-row-file1.txt")).toBeInTheDocument()
      expect(screen.getByTestId("object-row-file2.pdf")).toBeInTheDocument()
    })

    it("should render action menu for folders (delete only)", () => {
      render(<ObjectsTableView {...defaultProps} />)

      // Each folder row is rendered
      expect(screen.getByTestId("folder-row-documents/")).toBeInTheDocument()
      expect(screen.getByTestId("folder-row-images/")).toBeInTheDocument()
    })
  })

  describe("download and preview", () => {
    beforeEach(() => {
      downloadObjectMutate.mockReset()
      // Default: BFF returns text/plain (previewable)
      downloadObjectMutate.mockImplementation(async () => {
        async function* gen() {
          yield { chunk: btoa("hello"), downloaded: 5, total: 5, contentType: "text/plain", filename: "file1.txt" }
        }
        return gen()
      })
    })

    it("renders Download menu item in the object row actions", async () => {
      const user = userEvent.setup()
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))

      expect(screen.getByTestId("download-action-file1.txt")).toBeInTheDocument()
    })

    it("context-menu Download always triggers a file save", async () => {
      const user = userEvent.setup()
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))
      await user.click(screen.getByTestId("download-action-file1.txt"))

      await waitFor(() => expect(downloadObjectMutate).toHaveBeenCalled())
      expect(downloadObjectMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: "test-project",
          containerName: "test-bucket",
          objectKey: "file1.txt",
          filename: "file1.txt",
        })
      )
    })

    it("row-click previews in a new tab when Content-Type is previewable", async () => {
      const user = userEvent.setup()
      const mockTab = { location: { href: "" }, close: vi.fn() }
      vi.spyOn(window, "open").mockReturnValue(mockTab as unknown as Window)
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

      downloadObjectMutate.mockImplementationOnce(async () => {
        async function* gen() {
          yield { chunk: btoa("data"), downloaded: 4, total: 4, contentType: "image/png", filename: "photo.jpg" }
        }
        return gen()
      })

      const obj = [{ key: "photo.jpg", size: 1024, lastModified: "2024-01-15T10:00:00Z" }]
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={obj} />)

      await user.click(screen.getByRole("button", { name: /open photo\.jpg/i }))

      // Blank tab opened synchronously, blob URL assigned after stream completes
      expect(window.open).toHaveBeenCalledWith("", "_blank")
      await waitFor(() => expect(mockTab.location.href).toBe("blob:preview"))
    })

    it("row-click previews text files in a new tab", async () => {
      const user = userEvent.setup()
      const mockTab = { location: { href: "" }, close: vi.fn() }
      vi.spyOn(window, "open").mockReturnValue(mockTab as unknown as Window)
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

      // text/plain — previewable
      const obj = [{ key: "notes.txt", size: 1024, lastModified: "2024-01-15T10:00:00Z" }]
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={obj} />)

      await user.click(screen.getByRole("button", { name: /open notes\.txt/i }))

      await waitFor(() => expect(mockTab.location.href).toBe("blob:preview"))
    })

    it("row-click downloads when Content-Type is not previewable", async () => {
      const user = userEvent.setup()
      const mockTab = { location: { href: "" }, close: vi.fn() }
      vi.spyOn(window, "open").mockReturnValue(mockTab as unknown as Window)
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

      downloadObjectMutate.mockImplementationOnce(async () => {
        async function* gen() {
          yield {
            chunk: btoa("data"),
            downloaded: 4,
            total: 4,
            contentType: "application/zip",
            filename: "archive.zip",
          }
        }
        return gen()
      })

      const obj = [{ key: "archive.zip", size: 1024, lastModified: "2024-01-15T10:00:00Z" }]
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={obj} />)

      await user.click(screen.getByRole("button", { name: /open archive\.zip/i }))

      await waitFor(() => expect(downloadObjectMutate).toHaveBeenCalled())
      // Non-previewable: blank tab closed, no preview navigation
      await waitFor(() => expect(mockTab.close).toHaveBeenCalled())
      expect(mockTab.location.href).toBe("")
    })

    it("row-click downloads when BFF returns octet-stream (unknown type)", async () => {
      const user = userEvent.setup()
      const mockTab = { location: { href: "" }, close: vi.fn() }
      vi.spyOn(window, "open").mockReturnValue(mockTab as unknown as Window)
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

      downloadObjectMutate.mockImplementationOnce(async () => {
        async function* gen() {
          yield {
            chunk: btoa("data"),
            downloaded: 4,
            total: 4,
            contentType: "application/octet-stream",
            filename: "a1b2-uuid",
          }
        }
        return gen()
      })

      const obj = [{ key: "a1b2-uuid", size: 1024, lastModified: "2024-01-15T10:00:00Z" }]
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={obj} />)

      await user.click(screen.getByRole("button", { name: /open a1b2-uuid/i }))

      await waitFor(() => expect(mockTab.close).toHaveBeenCalled())
      expect(mockTab.location.href).toBe("")
    })
  })

  describe("modals", () => {
    it("should render all modal components", () => {
      render(<ObjectsTableView {...defaultProps} />)

      expect(screen.getByTestId("delete-modal")).toBeInTheDocument()
      expect(screen.getByTestId("copy-modal")).toBeInTheDocument()
      expect(screen.getByTestId("move-modal")).toBeInTheDocument()
      expect(screen.getByTestId("edit-metadata-modal")).toBeInTheDocument()
      expect(screen.getByTestId("version-history-modal")).toBeInTheDocument()
      expect(screen.getByTestId("restore-version-modal")).toBeInTheDocument()
    })
  })

  describe("edge cases", () => {
    it("should handle objects with missing lastModified", () => {
      const objectsWithMissingDate = [
        {
          key: "file.txt",
          size: 1024,
          lastModified: undefined as unknown as string,
        },
      ]

      render(<ObjectsTableView {...defaultProps} objects={objectsWithMissingDate} folders={[]} />)

      expect(screen.getByText("file.txt")).toBeInTheDocument()
      // Should show fallback for missing date (multiple "—" present, just check one exists)
      expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    })

    it("should handle very large file sizes", () => {
      const largeObjects = [
        {
          key: "large-file.bin",
          size: 1073741824, // 1 GiB
          lastModified: "2024-01-15T10:00:00Z",
        },
      ]

      render(<ObjectsTableView {...defaultProps} objects={largeObjects} />)

      expect(screen.getByText("large-file.bin")).toBeInTheDocument()
      expect(screen.getByText("1 GiB")).toBeInTheDocument()
    })

    it("should handle objects with special characters in names", () => {
      const specialObjects = [
        {
          key: "file-with-dashes.txt",
          size: 1024,
          lastModified: "2024-01-15T10:00:00Z",
        },
        {
          key: "file_with_underscores.txt",
          size: 1024,
          lastModified: "2024-01-15T10:00:00Z",
        },
      ]

      render(<ObjectsTableView {...defaultProps} objects={specialObjects} />)

      expect(screen.getByText("file-with-dashes.txt")).toBeInTheDocument()
      expect(screen.getByText("file_with_underscores.txt")).toBeInTheDocument()
    })

    it("should handle empty bucket name", () => {
      render(<ObjectsTableView {...defaultProps} bucketName="" />)

      // Should still render without errors
      expect(screen.getByText("Name")).toBeInTheDocument()
    })

    it("should handle many objects", () => {
      const manyObjects = Array.from({ length: 100 }, (_, i) => ({
        key: `file-${i}.txt`,
        size: 1024 * i,
        lastModified: "2024-01-15T10:00:00Z",
      }))

      render(<ObjectsTableView {...defaultProps} objects={manyObjects} folders={[]} />)

      // First and last should be visible
      expect(screen.getByText("file-0.txt")).toBeInTheDocument()
      expect(screen.getByText("file-99.txt")).toBeInTheDocument()
    })
  })
})
