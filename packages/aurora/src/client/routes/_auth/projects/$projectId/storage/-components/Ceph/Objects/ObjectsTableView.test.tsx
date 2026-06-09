import { render as rtlRender, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { ReactNode } from "react"
import { describe, it, expect, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { ObjectsTableView } from "./ObjectsTableView"

// Mock child components to isolate ObjectsTableView
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>,
  })
}

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

      const rows = screen.getAllByRole("row")
      // Header + 2 folders + 2 objects = 5 rows
      expect(rows).toHaveLength(5)

      // Folders should come first (rows 1 and 2 after header)
      expect(rows[1]).toHaveTextContent("documents")
      expect(rows[2]).toHaveTextContent("images")
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

      // PopupMenu should be present for each object
      const rows = screen.getAllByRole("row")
      // Should have menu buttons for objects (not folders in this simplified check)
      expect(rows.length).toBeGreaterThan(2) // Header + items
    })

    it("should render action menu for folders (delete only)", () => {
      render(<ObjectsTableView {...defaultProps} />)

      // Folders should also have action menu (simplified check)
      const rows = screen.getAllByRole("row")
      expect(rows.length).toBe(5) // Header + 2 folders + 2 objects
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
