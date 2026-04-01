import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ObjectsTableView } from "./ObjectsTableView"
import type { BrowserRow } from "./"

// ─── Mock virtualizer ─────────────────────────────────────────────────────────
// useVirtualizer doesn't work in jsdom (no layout engine), so we render all
// items directly by mocking getVirtualItems to return every row.

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

// DeleteFolderModal uses tRPC + useParams internally — mock it to keep
// ObjectsTableView tests isolated.
vi.mock("./DeleteFolderModal", () => ({
  DeleteFolderModal: vi.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="delete-folder-modal">
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

// Mock trpcReact — isolates download mutation from actual tRPC/network layer
let mockDownloadMutate = vi.fn()
let mockDownloadIsPending = false

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      swift: {
        downloadObject: {
          useMutation: vi.fn(
            ({
              onSuccess,
              onError,
            }: {
              onSuccess?: (data: { base64: string; contentType: string; filename: string }) => void
              onError?: (error: { message: string }) => void
            }) => ({
              mutate: (input: unknown) => mockDownloadMutate(input, { onSuccess, onError }),
              isPending: mockDownloadIsPending,
            })
          ),
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeFolder = (name: string): BrowserRow => ({
  kind: "folder",
  name: `${name}/`,
  displayName: name,
})

const makeObject = (name: string, overrides: Partial<Extract<BrowserRow, { kind: "object" }>> = {}): BrowserRow => ({
  kind: "object",
  name,
  displayName: name,
  bytes: 1024,
  last_modified: "2024-03-01T08:00:00.000000",
  content_type: "text/plain",
  ...overrides,
})

const mockRows: BrowserRow[] = [
  makeFolder("documents"),
  makeFolder("images"),
  makeObject("readme.txt"),
  makeObject("photo.png", { bytes: 204800, content_type: "image/png" }),
]

// ─── Render helper ────────────────────────────────────────────────────────────

const renderView = ({
  rows = mockRows,
  searchTerm = "",
  container = "test-container",
  onFolderClick = vi.fn(),
  onDeleteFolderSuccess = vi.fn(),
  onDeleteFolderError = vi.fn(),
  onDownloadError = vi.fn(),
}: {
  rows?: BrowserRow[]
  searchTerm?: string
  container?: string
  onFolderClick?: (prefix: string) => void
  onDeleteFolderSuccess?: (folderName: string, deletedCount: number) => void
  onDeleteFolderError?: (folderName: string, errorMessage: string) => void
  onDownloadError?: (objectName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ObjectsTableView
          rows={rows}
          searchTerm={searchTerm}
          container={container}
          onFolderClick={onFolderClick}
          onDeleteFolderSuccess={onDeleteFolderSuccess}
          onDeleteFolderError={onDeleteFolderError}
          onDownloadError={onDownloadError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ObjectsTableView", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockDownloadMutate = vi.fn()
    mockDownloadIsPending = false
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Empty state", () => {
    test("renders empty state when rows array is empty and no search term", () => {
      renderView({ rows: [] })
      expect(screen.getByText(/This folder is empty/i)).toBeInTheDocument()
    })

    test("renders no-match message when rows are empty and search term is set", () => {
      renderView({ rows: [], searchTerm: "xyz" })
      expect(screen.getByText(/No objects match your search/i)).toBeInTheDocument()
    })

    test("does not render table header in empty state", () => {
      renderView({ rows: [] })
      expect(screen.queryByTestId("objects-table-header")).not.toBeInTheDocument()
    })
  })

  describe("Table structure", () => {
    test("renders table header when rows exist", () => {
      renderView()
      expect(screen.getByTestId("objects-table-header")).toBeInTheDocument()
    })

    test("renders all column headers", () => {
      renderView()
      expect(screen.getByRole("columnheader", { name: "Object Name" })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: "Last Modified" })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: "Size" })).toBeInTheDocument()
    })

    test("renders table body", () => {
      renderView()
      expect(screen.getByTestId("objects-table-body")).toBeInTheDocument()
    })
  })

  describe("Row rendering", () => {
    test("renders a row for each item", () => {
      renderView()
      mockRows.forEach((row) => {
        expect(screen.getByTestId(`object-row-${row.name}`)).toBeInTheDocument()
      })
    })

    test("renders folder display names", () => {
      renderView()
      expect(screen.getByText("documents")).toBeInTheDocument()
      expect(screen.getByText("images")).toBeInTheDocument()
    })

    test("renders object display names", () => {
      renderView()
      expect(screen.getByText("readme.txt")).toBeInTheDocument()
      expect(screen.getByText("photo.png")).toBeInTheDocument()
    })

    test("renders — for last modified on folder rows", () => {
      renderView({ rows: [makeFolder("docs")] })
      const row = screen.getByTestId("object-row-docs/")
      expect(row).toHaveTextContent("—")
    })

    test("renders — for size on folder rows", () => {
      renderView({ rows: [makeFolder("docs")] })
      const row = screen.getByTestId("object-row-docs/")
      // Both last-modified and size cells show — for folders
      expect(row.textContent?.match(/—/g)?.length).toBeGreaterThanOrEqual(2)
    })

    test("renders formatted size for object rows", () => {
      // 1024 bytes = 1 KiB
      renderView({ rows: [makeObject("file.txt", { bytes: 1024 })] })
      expect(screen.getByText(/1(\s*)KiB/i)).toBeInTheDocument()
    })

    test("renders — for missing last_modified on objects", () => {
      renderView({ rows: [makeObject("file.txt", { last_modified: undefined })] })
      const row = screen.getByTestId("object-row-file.txt")
      expect(row).toHaveTextContent("—")
    })
  })

  describe("Folder navigation", () => {
    test("folder rows render as clickable buttons", () => {
      renderView()
      expect(screen.getByTestId("folder-documents/")).toBeInTheDocument()
    })

    test("clicking a folder row calls onFolderClick with the full prefix", async () => {
      const user = userEvent.setup()
      const onFolderClick = vi.fn()
      renderView({ onFolderClick })
      await user.click(screen.getByTestId("folder-documents/"))
      expect(onFolderClick).toHaveBeenCalledWith("documents/")
    })

    test("object rows do not render as buttons", () => {
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.queryByTestId("folder-readme.txt")).not.toBeInTheDocument()
    })
  })

  describe("Delete folder modal", () => {
    test("delete folder modal is closed by default", () => {
      renderView()
      expect(screen.queryByTestId("delete-folder-modal")).not.toBeInTheDocument()
    })

    test("opens delete folder modal when Delete Recursively is clicked", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeFolder("documents")] })
      // The popup menu items are only rendered after the toggle button is opened
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("delete-recursively-action-documents/"))
      expect(screen.getByTestId("delete-folder-modal")).toBeInTheDocument()
    })

    test("closes delete folder modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeFolder("documents")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("delete-recursively-action-documents/"))
      expect(screen.getByTestId("delete-folder-modal")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(screen.queryByTestId("delete-folder-modal")).not.toBeInTheDocument()
    })
  })

  describe("Footer", () => {
    test("shows item count in footer", () => {
      renderView()
      expect(screen.getByText(/4 items/i)).toBeInTheDocument()
    })

    test("footer total matches rows length", () => {
      renderView({ rows: [makeObject("a.txt"), makeObject("b.txt")] })
      expect(screen.getByText(/2 items/i)).toBeInTheDocument()
    })
  })

  describe("Download action", () => {
    test("Download menu item is present for object rows", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      expect(screen.getByTestId("download-action-readme.txt")).toBeInTheDocument()
    })

    test("Download menu item is not present for folder rows", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeFolder("docs")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      expect(screen.queryByTestId("download-action-docs/")).not.toBeInTheDocument()
    })

    test("clicking Download calls mutate with correct input", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")], container: "my-bucket" })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))
      expect(mockDownloadMutate).toHaveBeenCalledWith(
        expect.objectContaining({ container: "my-bucket", object: "readme.txt", filename: "readme.txt" }),
        expect.anything()
      )
    })

    test("calls onDownloadError when mutation fails", async () => {
      const onDownloadError = vi.fn()
      mockDownloadMutate = vi.fn((_input, { onError }) => {
        onError?.({ message: "Network error" })
      })
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")], onDownloadError })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))
      expect(onDownloadError).toHaveBeenCalledWith("readme.txt", "Network error")
    })
  })
})
