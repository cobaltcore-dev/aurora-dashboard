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

// Mock both modals to keep ObjectsTableView tests isolated.
vi.mock("./DeleteObjectModal", () => ({
  DeleteObjectModal: vi.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="delete-object-modal">
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

vi.mock("./DeleteFolderModal", () => ({
  DeleteFolderModal: vi.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="delete-folder-modal">
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

vi.mock("./CopyObjectModal", () => ({
  CopyObjectModal: vi.fn(({ isOpen, onClose, object }) =>
    isOpen ? (
      <div data-testid="copy-object-modal" data-object={object?.name}>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

vi.mock("./MoveRenameObjectModal", () => ({
  MoveRenameObjectModal: vi.fn(({ isOpen, onClose, object }) =>
    isOpen ? (
      <div data-testid="move-rename-object-modal" data-object={object?.name}>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

vi.mock("./GenerateTempUrlModal", () => ({
  GenerateTempUrlModal: vi.fn(({ isOpen, onClose, object, account }) =>
    isOpen ? (
      <div data-testid="generate-temp-url-modal" data-object={object?.name} data-account={account ?? ""}>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

vi.mock("./EditObjectMetadataModal", () => ({
  EditObjectMetadataModal: vi.fn(({ isOpen, onClose, object }) =>
    isOpen ? (
      <div data-testid="edit-object-metadata-modal" data-object={object?.name}>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

// ─── Mock trpcClient ──────────────────────────────────────────────────────────
// downloadObject is now an async iterable (streaming mutation) called via the
// vanilla trpcClient — mock it so tests can control chunks and errors without
// touching the network.

let mockDownloadIterable: AsyncIterable<{
  chunk: string
  downloaded: number
  total: number
  contentType?: string
  filename?: string
}> | null = null
let mockDownloadReject = false
let mockDownloadProgress: { percent: number; downloaded: number; total: number } | undefined = undefined

vi.mock("@/client/trpcClient", () => ({
  trpcClient: {
    storage: {
      swift: {
        downloadObject: {
          mutate: vi.fn(async () => {
            if (mockDownloadReject) throw new Error("Network error")
            return (
              mockDownloadIterable ??
              (async function* () {
                /* empty — no chunks */
              })()
            )
          }),
        },
      },
    },
  },
  trpcReact: {
    storage: {
      swift: {
        watchDownloadProgress: {
          useSubscription: vi.fn(() => ({ data: mockDownloadProgress })),
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
  onDeleteObjectSuccess = vi.fn(),
  onDeleteObjectError = vi.fn(),
  onCopyObjectSuccess = vi.fn(),
  onCopyObjectError = vi.fn(),
  onMoveObjectSuccess = vi.fn(),
  onMoveObjectError = vi.fn(),
  onTempUrlCopySuccess = vi.fn(),
  account = undefined as string | undefined,
  onEditMetadataSuccess = vi.fn(),
  onEditMetadataError = vi.fn(),
}: {
  rows?: BrowserRow[]
  searchTerm?: string
  container?: string
  account?: string
  onFolderClick?: (prefix: string) => void
  onDeleteFolderSuccess?: (folderName: string, deletedCount: number) => void
  onDeleteFolderError?: (folderName: string, errorMessage: string) => void
  onDownloadError?: (objectName: string, errorMessage: string) => void
  onDeleteObjectSuccess?: (objectName: string) => void
  onDeleteObjectError?: (objectName: string, errorMessage: string) => void
  onCopyObjectSuccess?: (objectName: string, targetContainer: string, targetPath: string) => void
  onCopyObjectError?: (objectName: string, errorMessage: string) => void
  onMoveObjectSuccess?: (objectName: string, targetContainer: string, targetPath: string) => void
  onMoveObjectError?: (objectName: string, errorMessage: string) => void
  onTempUrlCopySuccess?: (objectName: string) => void
  onEditMetadataSuccess?: (objectName: string) => void
  onEditMetadataError?: (objectName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ObjectsTableView
          rows={rows}
          searchTerm={searchTerm}
          container={container}
          account={account}
          onFolderClick={onFolderClick}
          onDeleteFolderSuccess={onDeleteFolderSuccess}
          onDeleteFolderError={onDeleteFolderError}
          onDownloadError={onDownloadError}
          onDeleteObjectSuccess={onDeleteObjectSuccess}
          onDeleteObjectError={onDeleteObjectError}
          onCopyObjectSuccess={onCopyObjectSuccess}
          onCopyObjectError={onCopyObjectError}
          onMoveObjectSuccess={onMoveObjectSuccess}
          onMoveObjectError={onMoveObjectError}
          onTempUrlCopySuccess={onTempUrlCopySuccess}
          onEditMetadataSuccess={onEditMetadataSuccess}
          onEditMetadataError={onEditMetadataError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ObjectsTableView", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockDownloadIterable = null
    mockDownloadReject = false
    mockDownloadProgress = undefined
    // jsdom doesn't implement URL.createObjectURL — stub it so preview tests
    // can assert on window.open being called with a blob URL string.
    URL.createObjectURL = vi.fn(() => "blob:mock-url")
    URL.revokeObjectURL = vi.fn()
    const mockTab = { location: { href: "" }, close: vi.fn() }
    vi.spyOn(window, "open").mockImplementation(() => mockTab as unknown as Window)
    // Restore default implementation after any vi.mocked() override in previous tests
    const { trpcClient } = await import("@/client/trpcClient")
    vi.mocked(trpcClient.storage.swift.downloadObject.mutate).mockImplementation(async () => {
      if (mockDownloadReject) throw new Error("Network error")
      return (
        mockDownloadIterable ??
        (async function* () {
          /* empty */
        })()
      )
    })
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

    test("object rows render as clickable buttons for preview/download", () => {
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.getByTestId("preview-readme.txt")).toBeInTheDocument()
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

  describe("File preview", () => {
    test("clicking a previewable file name opens a new tab", async () => {
      const user = userEvent.setup()
      // text/plain is previewable
      renderView({ rows: [makeObject("readme.txt", { content_type: "text/plain" })] })
      await user.click(screen.getByTestId("preview-readme.txt"))
      await vi.waitFor(() => {
        expect(window.open).toHaveBeenCalledWith("", "_blank")
        const mockTab = vi.mocked(window.open).mock.results[0].value as { location: { href: string } }
        expect(mockTab.location.href).toBe("blob:mock-url")
      })
    })

    test("clicking a non-previewable file name triggers download instead", async () => {
      const user = userEvent.setup()
      // application/zip is not previewable — should trigger anchor download, not window.open
      renderView({ rows: [makeObject("archive.zip", { content_type: "application/zip" })] })
      await user.click(screen.getByTestId("preview-archive.zip"))
      await vi.waitFor(() => {
        expect(window.open).not.toHaveBeenCalled()
      })
    })

    test("shows spinner on file name while preview is loading", async () => {
      let unblock!: () => void
      const blocker = new Promise<void>((resolve) => {
        unblock = resolve
      })

      const { trpcClient } = await import("@/client/trpcClient")
      vi.mocked(trpcClient.storage.swift.downloadObject.mutate).mockImplementation(async () => {
        await blocker
        return (async function* () {})()
      })

      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt", { content_type: "text/plain" })] })
      await user.click(screen.getByTestId("preview-readme.txt"))

      // Spinner replaces the file icon while loading
      expect(screen.getByTestId("preview-readme.txt").querySelector("svg, [class*=spinner]")).toBeTruthy()

      unblock()
    })

    test("file name button is disabled while any download is in progress", async () => {
      let unblock!: () => void
      const blocker = new Promise<void>((resolve) => {
        unblock = resolve
      })

      const { trpcClient } = await import("@/client/trpcClient")
      vi.mocked(trpcClient.storage.swift.downloadObject.mutate).mockImplementation(async () => {
        await blocker
        return (async function* () {})()
      })

      const user = userEvent.setup()
      // Use a non-previewable file to trigger download path
      renderView({
        rows: [
          makeObject("archive.zip", { content_type: "application/zip" }),
          makeObject("readme.txt", { content_type: "text/plain" }),
        ],
      })

      // Start download on first file via popup menu
      const [firstMore] = screen.getAllByRole("button", { name: /More/i })
      await user.click(firstMore)
      await user.click(screen.getByTestId("download-action-archive.zip"))

      // Both file name buttons should be disabled
      const previewButtons = screen.getAllByTestId(/^preview-/)
      previewButtons.forEach((btn) => expect(btn).toBeDisabled())

      unblock()
    })

    test("calls onDownloadError when preview fetch throws", async () => {
      mockDownloadReject = true
      const onDownloadError = vi.fn()
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt", { content_type: "text/plain" })], onDownloadError })
      await user.click(screen.getByTestId("preview-readme.txt"))
      await vi.waitFor(() => {
        expect(onDownloadError).toHaveBeenCalledWith("readme.txt", "Network error")
      })
    })

    test("previewable file name button has Preview title", () => {
      renderView({ rows: [makeObject("readme.txt", { content_type: "text/plain" })] })
      expect(screen.getByTestId("preview-readme.txt")).toHaveAttribute("title", expect.stringContaining("Preview"))
    })

    test("non-previewable file name button has Download title", () => {
      renderView({ rows: [makeObject("archive.zip", { content_type: "application/zip" })] })
      expect(screen.getByTestId("preview-archive.zip")).toHaveAttribute("title", expect.stringContaining("Download"))
    })

    test("image/png is treated as previewable", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("photo.png", { content_type: "image/png" })] })
      await user.click(screen.getByTestId("preview-photo.png"))
      await vi.waitFor(() => {
        expect(window.open).toHaveBeenCalled()
      })
    })

    test("application/pdf is treated as previewable", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("doc.pdf", { content_type: "application/pdf" })] })
      await user.click(screen.getByTestId("preview-doc.pdf"))
      await vi.waitFor(() => {
        expect(window.open).toHaveBeenCalled()
      })
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

    test("clicking Download calls trpcClient.mutate with correct input", async () => {
      const { trpcClient } = await import("@/client/trpcClient")
      mockDownloadIterable = (async function* () {})()
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")], container: "my-bucket" })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))
      expect(trpcClient.storage.swift.downloadObject.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ container: "my-bucket", object: "readme.txt", filename: "readme.txt" })
      )
    })

    test("Download menu item is disabled while download is in progress", async () => {
      // Block mutate so the download stays in-flight while we assert
      let unblock!: () => void
      const blocker = new Promise<void>((resolve) => {
        unblock = resolve
      })

      const { trpcClient } = await import("@/client/trpcClient")
      vi.mocked(trpcClient.storage.swift.downloadObject.mutate).mockImplementation(async () => {
        await blocker
        return (async function* () {})()
      })

      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })

      // First open — click download to start
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))

      // The More button itself is disabled — menu cannot be opened
      const moreButton = screen.getByRole("button", { name: /More/i })
      expect(moreButton).toBeDisabled()

      unblock()
    })

    test("shows Downloading... in last modified cell while download is in progress", async () => {
      let unblock!: () => void
      const blocker = new Promise<void>((resolve) => {
        unblock = resolve
      })

      const { trpcClient } = await import("@/client/trpcClient")
      vi.mocked(trpcClient.storage.swift.downloadObject.mutate).mockImplementation(async () => {
        await blocker
        return (async function* () {})()
      })

      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))

      expect(await screen.findByText(/Downloading\.\.\./i)).toBeInTheDocument()

      unblock()
    })

    test("actions menu is disabled for the downloading row", async () => {
      let unblock!: () => void
      const blocker = new Promise<void>((resolve) => {
        unblock = resolve
      })

      const { trpcClient } = await import("@/client/trpcClient")
      vi.mocked(trpcClient.storage.swift.downloadObject.mutate).mockImplementation(async () => {
        await blocker
        return (async function* () {})()
      })

      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))

      // The More button for the downloading row should be disabled
      const moreButton = screen.getByRole("button", { name: /More/i })
      expect(moreButton).toBeDisabled()

      unblock()
    })

    test("shows percentage when content-length is known", async () => {
      let unblock!: () => void
      const blocker = new Promise<void>((resolve) => {
        unblock = resolve
      })

      // Block the download so the row stays in downloading state
      const { trpcClient } = await import("@/client/trpcClient")
      vi.mocked(trpcClient.storage.swift.downloadObject.mutate).mockImplementation(async () => {
        await blocker
        return (async function* () {})()
      })

      const user = userEvent.setup()
      const { rerender } = renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))

      // Simulate watchDownloadProgress subscription emitting 50% progress
      mockDownloadProgress = { percent: 50, downloaded: 50, total: 100 }
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ObjectsTableView
              rows={[makeObject("readme.txt")]}
              searchTerm=""
              container="test-container"
              onFolderClick={vi.fn()}
              onDeleteFolderSuccess={vi.fn()}
              onDeleteFolderError={vi.fn()}
              onDownloadError={vi.fn()}
              onDeleteObjectSuccess={vi.fn()}
              onDeleteObjectError={vi.fn()}
              onCopyObjectSuccess={vi.fn()}
              onCopyObjectError={vi.fn()}
              onMoveObjectSuccess={vi.fn()}
              onMoveObjectError={vi.fn()}
              onTempUrlCopySuccess={vi.fn()}
              onEditMetadataSuccess={vi.fn()}
              onEditMetadataError={vi.fn()}
            />
          </PortalProvider>
        </I18nProvider>
      )

      expect(await screen.findByText("50%")).toBeInTheDocument()

      unblock()
    })

    test("shows Downloading... when total is unknown (no content-length)", async () => {
      let unblock!: () => void
      const blocker = new Promise<void>((resolve) => {
        unblock = resolve
      })

      const { trpcClient } = await import("@/client/trpcClient")
      vi.mocked(trpcClient.storage.swift.downloadObject.mutate).mockImplementation(async () => {
        await blocker
        return (async function* () {
          /* empty */
        })()
      })

      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))

      expect(await screen.findByText(/Downloading\.\.\./i)).toBeInTheDocument()

      unblock()
    })

    test("actions menu is disabled on all rows while a download is in progress", async () => {
      let unblock!: () => void
      const blocker = new Promise<void>((resolve) => {
        unblock = resolve
      })

      const { trpcClient } = await import("@/client/trpcClient")
      vi.mocked(trpcClient.storage.swift.downloadObject.mutate).mockImplementation(async () => {
        await blocker
        return (async function* () {
          /* empty */
        })()
      })

      const user = userEvent.setup()
      // Render two object rows
      renderView({ rows: [makeObject("readme.txt"), makeObject("photo.png")] })

      // Start download on the first row
      const [firstMore] = screen.getAllByRole("button", { name: /More/i })
      await user.click(firstMore)
      await user.click(screen.getByTestId("download-action-readme.txt"))

      // Both More buttons should now be disabled
      const moreButtons = screen.getAllByRole("button", { name: /More/i })
      moreButtons.forEach((btn) => expect(btn).toBeDisabled())

      unblock()
    })

    test("calls onDownloadError when mutate throws", async () => {
      mockDownloadReject = true
      const onDownloadError = vi.fn()
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")], onDownloadError })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))
      await vi.waitFor(() => {
        expect(onDownloadError).toHaveBeenCalledWith("readme.txt", "Network error")
      })
    })
  })

  describe("Move/Rename object modal", () => {
    test("move/rename modal is closed by default", () => {
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.queryByTestId("move-rename-object-modal")).not.toBeInTheDocument()
    })

    test("opens move/rename modal when Move/Rename is clicked", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("move-rename-action-readme.txt"))
      expect(screen.getByTestId("move-rename-object-modal")).toBeInTheDocument()
    })

    test("passes correct object name to MoveRenameObjectModal", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("move-rename-action-readme.txt"))
      expect(screen.getByTestId("move-rename-object-modal")).toHaveAttribute("data-object", "readme.txt")
    })

    test("closes move/rename modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("move-rename-action-readme.txt"))
      expect(screen.getByTestId("move-rename-object-modal")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(screen.queryByTestId("move-rename-object-modal")).not.toBeInTheDocument()
    })

    test("Move/Rename action is not present for folder rows", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeFolder("docs")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      expect(screen.queryByTestId("move-rename-action-docs/")).not.toBeInTheDocument()
    })
  })

  describe("Copy object modal", () => {
    test("copy object modal is closed by default", () => {
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.queryByTestId("copy-object-modal")).not.toBeInTheDocument()
    })

    test("opens copy modal when Copy is clicked", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("copy-action-readme.txt"))
      expect(screen.getByTestId("copy-object-modal")).toBeInTheDocument()
    })

    test("passes correct object name to CopyObjectModal", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("copy-action-readme.txt"))
      expect(screen.getByTestId("copy-object-modal")).toHaveAttribute("data-object", "readme.txt")
    })

    test("closes copy modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("copy-action-readme.txt"))
      expect(screen.getByTestId("copy-object-modal")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(screen.queryByTestId("copy-object-modal")).not.toBeInTheDocument()
    })

    test("Copy action is not present for folder rows", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeFolder("docs")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      expect(screen.queryByTestId("copy-action-docs/")).not.toBeInTheDocument()
    })
  })

  describe("Delete object modal", () => {
    test("delete object modal is closed by default", () => {
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.queryByTestId("delete-object-modal")).not.toBeInTheDocument()
    })

    test("opens delete modal when Delete is clicked", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("delete-action-readme.txt"))
      expect(screen.getByTestId("delete-object-modal")).toBeInTheDocument()
    })

    test("Delete (Keep Segments) action is no longer present in the menu", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      expect(screen.queryByTestId("delete-keep-segments-action-readme.txt")).not.toBeInTheDocument()
    })

    test("closes delete object modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("delete-action-readme.txt"))
      expect(screen.getByTestId("delete-object-modal")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(screen.queryByTestId("delete-object-modal")).not.toBeInTheDocument()
    })
  })

  describe("Share (Temporary URL) modal", () => {
    test("temp URL modal is closed by default", () => {
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.queryByTestId("generate-temp-url-modal")).not.toBeInTheDocument()
    })

    test("opens temp URL modal when Share action is clicked", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("temp-url-action-readme.txt"))
      expect(screen.getByTestId("generate-temp-url-modal")).toBeInTheDocument()
    })

    test("passes correct object name to GenerateTempUrlModal", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("temp-url-action-readme.txt"))
      expect(screen.getByTestId("generate-temp-url-modal")).toHaveAttribute("data-object", "readme.txt")
    })

    test("forwards account prop to GenerateTempUrlModal", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")], account: "AUTH_other" })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("temp-url-action-readme.txt"))
      expect(screen.getByTestId("generate-temp-url-modal")).toHaveAttribute("data-account", "AUTH_other")
    })

    test("closes temp URL modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("temp-url-action-readme.txt"))
      expect(screen.getByTestId("generate-temp-url-modal")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(screen.queryByTestId("generate-temp-url-modal")).not.toBeInTheDocument()
    })

    test("Share action is not present for folder rows", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeFolder("docs")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      expect(screen.queryByTestId("temp-url-action-docs/")).not.toBeInTheDocument()
    })
  })

  describe("Properties (Edit metadata) modal", () => {
    test("edit metadata modal is closed by default", () => {
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.queryByTestId("edit-object-metadata-modal")).not.toBeInTheDocument()
    })

    test("opens edit metadata modal when Properties is clicked", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("edit-metadata-action-readme.txt"))
      expect(screen.getByTestId("edit-object-metadata-modal")).toBeInTheDocument()
    })

    test("passes correct object name to EditObjectMetadataModal", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("edit-metadata-action-readme.txt"))
      expect(screen.getByTestId("edit-object-metadata-modal")).toHaveAttribute("data-object", "readme.txt")
    })

    test("closes edit metadata modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("edit-metadata-action-readme.txt"))
      expect(screen.getByTestId("edit-object-metadata-modal")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(screen.queryByTestId("edit-object-metadata-modal")).not.toBeInTheDocument()
    })

    test("Properties action is not present for folder rows", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeFolder("docs")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      expect(screen.queryByTestId("edit-metadata-action-docs/")).not.toBeInTheDocument()
    })
  })
})
