import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
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

// ─── Mock the download store ──────────────────────────────────────────────────
// The component no longer streams downloads itself — it delegates to the module
// store (start/cancel) and reads in-flight transfers via useSyncExternalStore.
// A controllable stand-in lets tests drive the transfer map and assert the calls.

const { storeState } = vi.hoisted(() => ({
  storeState: {
    map: new Map<string, { kind: "download" | "preview"; downloadId: string; worker: unknown }>(),
    // useSyncExternalStore needs a stable snapshot reference between changes.
    snapshot: new Map<string, { kind: "download" | "preview"; downloadId: string; worker: unknown }>(),
    listeners: new Set<() => void>(),
    startObjectDownload: vi.fn(),
    cancelObjectDownload: vi.fn(),
  },
}))

vi.mock("./stores/objectDownloadStore", () => ({
  startObjectDownload: (opts: unknown) => storeState.startObjectDownload(opts),
  cancelObjectDownload: (container: string, objectKey: string) => storeState.cancelObjectDownload(container, objectKey),
  subscribeTransfers: (listener: () => void) => {
    storeState.listeners.add(listener)
    return () => storeState.listeners.delete(listener)
  },
  getTransfersSnapshot: () => storeState.snapshot,
  transferKey: (container: string, objectKey: string) => `${container}:${objectKey}`,
  isPreviewableContentType: (contentType: string) => {
    const base = String(contentType).split(";")[0].trim().toLowerCase()
    if (["application/pdf", "text/plain"].includes(base)) return true
    if (base === "image/svg+xml") return false
    return base.startsWith("image/") || base.startsWith("video/") || base.startsWith("audio/")
  },
}))

vi.mock("./ObjectToastNotifications", () => ({
  getObjectDownloadCancelledToast: (objectKey: string) => ({
    message: "Download Cancelled",
    description: `Download of "${objectKey}" was cancelled.`,
  }),
}))

// ─── Mock trpcClient ──────────────────────────────────────────────────────────
// The only tRPC the component still touches is the per-row progress subscription
// (via RowTransferProgress). Mocked so tests can drive the reported percent.

let mockDownloadProgress: { percent: number; downloaded: number; total: number } | undefined = undefined

vi.mock("@/client/trpcClient", () => ({
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

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project",
}))

// ─── Toast spy (partial-mock: keep real Juno components) ───────────────────────

// Hoisted so the vi.mock factory below (lifted to the top of the file) can
// reference it — a plain top-level const isn't initialized yet when the hoisted
// mock runs.
const { toastWarning } = vi.hoisted(() => ({ toastWarning: vi.fn() }))
vi.mock("@cloudoperators/juno-ui-components", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    toast: Object.assign(vi.fn(), { warning: toastWarning, dismiss: vi.fn(), success: vi.fn(), error: vi.fn() }),
  }
})

// ─── Modal mocks — keep ObjectsTableView tests isolated ───────────────────────

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

// Seed an in-flight transfer into the store before rendering.
const seedTransfer = (
  container: string,
  objectKey: string,
  transfer: { kind: "download" | "preview"; downloadId?: string }
) => {
  storeState.map.set(`${container}:${objectKey}`, {
    downloadId: `${container}:${objectKey}:uuid`,
    worker: {},
    ...transfer,
  })
  storeState.snapshot = new Map(storeState.map)
}

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
  selectedObjects = [] as string[],
  setSelectedObjects = vi.fn(),
  hasAnyBulkAction = true,
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
  selectedObjects?: string[]
  setSelectedObjects?: (objects: string[]) => void
  hasAnyBulkAction?: boolean
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
          selectedObjects={selectedObjects}
          setSelectedObjects={setSelectedObjects}
          hasAnyBulkAction={hasAnyBulkAction}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ObjectsTableView", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockDownloadProgress = undefined
    storeState.map.clear()
    storeState.snapshot = new Map()
    storeState.listeners.clear()
    storeState.startObjectDownload.mockReset()
    storeState.cancelObjectDownload.mockReset()
    toastWarning.mockReset()
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
      expect(row.textContent?.match(/—/g)?.length).toBeGreaterThanOrEqual(2)
    })

    test("renders formatted size for object rows", () => {
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

  describe("Preview / download (row click)", () => {
    test("clicking a previewable file name starts a preview transfer", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt", { content_type: "text/plain" })], container: "my-bucket" })
      await user.click(screen.getByTestId("preview-readme.txt"))
      expect(storeState.startObjectDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "preview",
          container: "my-bucket",
          objectKey: "readme.txt",
          filename: "readme.txt",
          projectId: "test-project",
        })
      )
    })

    test("clicking a non-previewable file name also starts a preview transfer (store decides save vs open)", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("archive.zip", { content_type: "application/zip" })] })
      await user.click(screen.getByTestId("preview-archive.zip"))
      expect(storeState.startObjectDownload).toHaveBeenCalledWith(expect.objectContaining({ kind: "preview" }))
    })

    test("forwards account to the transfer when provided", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")], account: "AUTH_other" })
      await user.click(screen.getByTestId("preview-readme.txt"))
      expect(storeState.startObjectDownload).toHaveBeenCalledWith(expect.objectContaining({ account: "AUTH_other" }))
    })

    test("passes onDownloadError through as the transfer's onError", async () => {
      const onDownloadError = vi.fn()
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")], onDownloadError })
      await user.click(screen.getByTestId("preview-readme.txt"))
      expect(storeState.startObjectDownload).toHaveBeenCalledWith(expect.objectContaining({ onError: onDownloadError }))
    })

    test("previewable file name button has Preview title", () => {
      renderView({ rows: [makeObject("readme.txt", { content_type: "text/plain" })] })
      expect(screen.getByTestId("preview-readme.txt")).toHaveAttribute("title", expect.stringContaining("Preview"))
    })

    test("non-previewable file name button has Download title", () => {
      renderView({ rows: [makeObject("archive.zip", { content_type: "application/zip" })] })
      expect(screen.getByTestId("preview-archive.zip")).toHaveAttribute("title", expect.stringContaining("Download"))
    })

    test("shows a spinner on the file name while a preview transfer is in flight", () => {
      seedTransfer("test-container", "readme.txt", { kind: "preview" })
      renderView({ rows: [makeObject("readme.txt", { content_type: "text/plain" })] })
      expect(screen.getByTestId("preview-readme.txt").querySelector("svg, [class*=spinner]")).toBeTruthy()
    })

    test("disables the file name button for a row that is transferring", () => {
      seedTransfer("test-container", "readme.txt", { kind: "download" })
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.getByTestId("preview-readme.txt")).toBeDisabled()
    })
  })

  describe("Download (menu action)", () => {
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

    test("clicking Download starts a download transfer with the swift fields", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")], container: "my-bucket" })
      await user.click(screen.getByRole("button", { name: /More/i }))
      await user.click(screen.getByTestId("download-action-readme.txt"))
      expect(storeState.startObjectDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "download",
          container: "my-bucket",
          objectKey: "readme.txt",
          filename: "readme.txt",
        })
      )
    })

    test("Download menu item reads 'Downloading...' while its row is transferring", async () => {
      const user = userEvent.setup()
      seedTransfer("test-container", "readme.txt", { kind: "download" })
      renderView({ rows: [makeObject("readme.txt")] })
      await user.click(screen.getByRole("button", { name: /More/i }))
      expect(screen.getByTestId("download-action-readme.txt")).toHaveTextContent(/Downloading/i)
    })
  })

  describe("In-flight transfer UI (progress + cancel)", () => {
    test("shows Downloading... in the last-modified cell for a download transfer", () => {
      seedTransfer("test-container", "readme.txt", { kind: "download" })
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.getByText(/Downloading\.\.\./i)).toBeInTheDocument()
    })

    test("shows Loading preview... for a preview transfer", () => {
      seedTransfer("test-container", "readme.txt", { kind: "preview" })
      renderView({ rows: [makeObject("readme.txt", { content_type: "text/plain" })] })
      expect(screen.getByText(/Loading preview\.\.\./i)).toBeInTheDocument()
    })

    test("shows the percentage when the progress subscription reports one", () => {
      mockDownloadProgress = { percent: 50, downloaded: 50, total: 100 }
      seedTransfer("test-container", "readme.txt", { kind: "download" })
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.getByText("50%")).toBeInTheDocument()
    })

    test("renders a cancel control for a transferring row", () => {
      seedTransfer("test-container", "readme.txt", { kind: "download" })
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.getByTestId("cancel-transfer-readme.txt")).toBeInTheDocument()
    })

    test("clicking cancel calls cancelObjectDownload and shows a cancelled toast", () => {
      storeState.cancelObjectDownload.mockReturnValue({ kind: "download", downloadId: "d", worker: {} })
      seedTransfer("test-container", "readme.txt", { kind: "download" })
      renderView({ rows: [makeObject("readme.txt")] })
      fireEvent.click(screen.getByTestId("cancel-transfer-readme.txt"))
      expect(storeState.cancelObjectDownload).toHaveBeenCalledWith("test-container", "readme.txt")
      expect(toastWarning).toHaveBeenCalled()
    })

    test("does not toast when cancel finds no active transfer (no-op)", () => {
      storeState.cancelObjectDownload.mockReturnValue(undefined)
      seedTransfer("test-container", "readme.txt", { kind: "download" })
      renderView({ rows: [makeObject("readme.txt")] })
      fireEvent.click(screen.getByTestId("cancel-transfer-readme.txt"))
      expect(toastWarning).not.toHaveBeenCalled()
    })

    test("leaves other rows interactive while one row transfers (concurrent downloads)", () => {
      seedTransfer("test-container", "readme.txt", { kind: "download" })
      renderView({ rows: [makeObject("readme.txt"), makeObject("photo.png", { content_type: "image/png" })] })
      // The transferring row's name button is disabled…
      expect(screen.getByTestId("preview-readme.txt")).toBeDisabled()
      // …but the other row remains clickable.
      expect(screen.getByTestId("preview-photo.png")).not.toBeDisabled()
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

  describe("Share URL modal", () => {
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

  describe("Selection", () => {
    const objectRows = mockRows.filter((r) => r.kind === "object")

    test("renders a checkbox for each object row", () => {
      renderView()
      objectRows.forEach((r) => {
        expect(screen.getByTestId(`select-object-${r.name}`)).toBeInTheDocument()
      })
    })

    test("renders a disabled checkbox for folder rows", () => {
      renderView()
      const folderRows = mockRows.filter((r) => r.kind === "folder")
      folderRows.forEach((r) => {
        const cb = screen.getByTestId(`select-folder-disabled-${r.name}`)
        expect(cb).toBeDisabled()
        expect(cb).not.toBeChecked()
        expect(screen.queryByTestId(`select-object-${r.name}`)).not.toBeInTheDocument()
      })
    })

    test("folder checkbox tooltip text is present on hover", async () => {
      renderView()
      const folderName = mockRows.filter((r) => r.kind === "folder")[0].name
      const trigger = screen.getByTestId(`select-folder-disabled-${folderName}`).closest("button")!
      await act(async () => {
        fireEvent.mouseEnter(trigger)
      })
      expect(screen.getByRole("tooltip")).toHaveTextContent(/Folders cannot be bulk-deleted/i)
    })

    test("row checkbox is unchecked when object is not selected", () => {
      renderView({ selectedObjects: [] })
      expect(screen.getByTestId("select-object-readme.txt")).not.toBeChecked()
    })

    test("row checkbox is checked when object is in selectedObjects", () => {
      renderView({ selectedObjects: ["readme.txt"] })
      expect(screen.getByTestId("select-object-readme.txt")).toBeChecked()
      expect(screen.getByTestId("select-object-photo.png")).not.toBeChecked()
    })

    test("clicking a row checkbox calls setSelectedObjects with the object added", async () => {
      const setSelectedObjects = vi.fn()
      const user = userEvent.setup()
      renderView({ selectedObjects: [], setSelectedObjects })
      await user.click(screen.getByTestId("select-object-readme.txt"))
      expect(setSelectedObjects).toHaveBeenCalledWith(["readme.txt"])
    })

    test("clicking a checked row checkbox calls setSelectedObjects with the object removed", async () => {
      const setSelectedObjects = vi.fn()
      const user = userEvent.setup()
      renderView({ selectedObjects: ["readme.txt", "photo.png"], setSelectedObjects })
      await user.click(screen.getByTestId("select-object-readme.txt"))
      expect(setSelectedObjects).toHaveBeenCalledWith(["photo.png"])
    })

    test("row checkbox is disabled while its row is transferring", () => {
      seedTransfer("test-container", "readme.txt", { kind: "download" })
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.getByTestId("select-object-readme.txt")).toBeDisabled()
    })
  })

  describe("Selection column gating (hasAnyBulkAction)", () => {
    const objectRows = mockRows.filter((r) => r.kind === "object")

    test("renders no per-row checkboxes when hasAnyBulkAction is false", () => {
      renderView({ hasAnyBulkAction: false })
      objectRows.forEach((r) => {
        expect(screen.queryByTestId(`select-object-${r.name}`)).not.toBeInTheDocument()
      })
      mockRows
        .filter((r) => r.kind === "folder")
        .forEach((r) => {
          expect(screen.queryByTestId(`select-folder-disabled-${r.name}`)).not.toBeInTheDocument()
        })
    })

    test("still renders every row when hasAnyBulkAction is false", () => {
      renderView({ hasAnyBulkAction: false })
      mockRows.forEach((r) => {
        expect(screen.getByTestId(`object-row-${r.name}`)).toBeInTheDocument()
      })
    })

    test("row action menus remain available when hasAnyBulkAction is false", async () => {
      const user = userEvent.setup()
      renderView({ rows: [makeObject("readme.txt")], hasAnyBulkAction: false })
      await user.click(screen.getByRole("button", { name: /More/i }))
      expect(screen.getByTestId("download-action-readme.txt")).toBeInTheDocument()
    })

    test("renders the selection column by default (hasAnyBulkAction defaults to true)", () => {
      renderView()
      expect(screen.getByTestId("select-object-readme.txt")).toBeInTheDocument()
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

  describe("Viewport height", () => {
    test("sizes the table body from the measured viewport space, not a fixed offset", () => {
      renderView()
      const body = screen.getByTestId("objects-table-body")
      expect(body.style.height).toMatch(/^\d+px$/)
      expect(parseInt(body.style.height, 10)).toBeGreaterThan(0)
      expect(parseInt(body.style.height, 10)).toBeLessThanOrEqual(window.innerHeight)
    })

    test("renders rows only once the height is known", () => {
      renderView()
      expect(screen.getByTestId("objects-table-body").style.height).not.toBe("0px")
      expect(screen.getByTestId("object-row-readme.txt")).toBeInTheDocument()
    })
  })
})
