import { render as rtlRender, screen, within, waitFor, act } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider, toast } from "@cloudoperators/juno-ui-components"
import type { ReactNode } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import userEvent from "@testing-library/user-event"
import { ObjectsTableView } from "./ObjectsTableView"

// Hoisted mocks for the download wiring (referenced inside vi.mock factories).
// useSubscriptionMock's return type is declared explicitly (rather than
// inferred from the default `() => ({ data: undefined })` implementation) so
// individual tests can mock live progress data via mockImplementation without
// TypeScript narrowing `data` to the literal type `undefined`.
const { startObjectDownloadMock, cancelObjectDownloadMock, storeState, useSubscriptionMock } = vi.hoisted(() => ({
  startObjectDownloadMock: vi.fn(),
  cancelObjectDownloadMock: vi.fn(),
  // Mutable stand-in for the module store. Tests drive it via setActiveTransfer/
  // clearTransfers; the component reads it through the mocked store selectors.
  storeState: {
    snapshot: new Map<string, { kind: "download" | "preview"; downloadId: string; worker: unknown }>(),
    listeners: new Set<() => void>(),
  },
  useSubscriptionMock: vi.fn((): { data: { downloaded: number; total: number; percent: number } | undefined } => ({
    data: undefined,
  })),
}))

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project",
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: { ceph: { objects: { watchDownloadProgress: { useSubscription: useSubscriptionMock } } } },
  },
}))

// The download pipeline (worker, streaming, decode, Blob save) now lives in the
// module store; the component only starts/cancels transfers and renders whatever
// the store reports. Mock the store so these are isolated, unit-testable calls.
// The store's own logic is covered in objectDownloadStore.test.ts.
vi.mock("./stores/objectDownloadStore", () => ({
  transferKey: (bucketName: string, objectKey: string) => `${bucketName}:${objectKey}`,
  subscribeTransfers: (listener: () => void) => {
    storeState.listeners.add(listener)
    return () => storeState.listeners.delete(listener)
  },
  getTransfersSnapshot: () => storeState.snapshot,
  startObjectDownload: startObjectDownloadMock,
  cancelObjectDownload: cancelObjectDownloadMock,
}))

// The component calls toast(...) directly for the "download started"
// notification (a neutral/base call, not .success/.error/.warning), so the
// mock needs the base export itself to be a spy — not just its sub-methods.
vi.mock("@cloudoperators/juno-ui-components", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cloudoperators/juno-ui-components")>()
  const toastFn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  })
  return {
    ...actual,
    toast: toastFn,
  }
})

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

// The toast helpers hand toast()/toast.warning() the raw <Trans> elements, not
// rendered strings, so assertions match on the macro-generated `message` prop
// (the source copy) rather than on the element's text.
const transMessage = (message: string | RegExp) =>
  expect.objectContaining({ props: expect.objectContaining({ message: expect.stringMatching(message) }) })

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
  // vitest.config.ts doesn't enable global mock restoration, so spies created
  // with vi.spyOn (URL.createObjectURL/revokeObjectURL, HTMLAnchorElement's
  // click) must be restored explicitly, or they leak into later tests.
  //
  // vi.restoreAllMocks() also resets the hoisted store/subscription vi.fn()s
  // (they have no "original" to restore to, so restoring clears their
  // implementation) — the beforeEach below re-establishes their defaults so
  // components that read live progress don't crash on the next test.

  // Drives the mocked store snapshot and notifies subscribers, wrapped in act()
  // so useSyncExternalStore re-renders settle before assertions.
  const setActiveTransfer = (
    bucketName: string,
    objectKey: string,
    kind: "download" | "preview",
    downloadId: string
  ) => {
    act(() => {
      const next = new Map(storeState.snapshot)
      next.set(`${bucketName}:${objectKey}`, { kind, downloadId, worker: {} })
      storeState.snapshot = next
      storeState.listeners.forEach((l) => l())
    })
  }

  beforeEach(() => {
    useSubscriptionMock.mockImplementation(() => ({ data: undefined }))
    startObjectDownloadMock.mockReset()
    cancelObjectDownloadMock.mockReset()
    storeState.snapshot = new Map()
    storeState.listeners.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

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
      // toast lives in the module mock factory, so vi.restoreAllMocks() in
      // afterEach leaves its call history intact — clear it explicitly or calls
      // leak between tests and "not.toHaveBeenCalled()" assertions see them.
      vi.mocked(toast).mockClear()
      vi.mocked(toast.warning).mockClear()
      // Shared across defaultProps — clear so one test calling it can't trip a
      // later "not.toHaveBeenCalled()" assertion.
      vi.mocked(defaultProps.onDownloadError).mockClear()
    })

    it("renders Download menu item in the object row actions", async () => {
      const user = userEvent.setup()
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))

      expect(screen.getByTestId("download-action-file1.txt")).toBeInTheDocument()
    })

    it("context-menu Download starts a 'download' transfer via the store", async () => {
      const user = userEvent.setup()
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))
      await user.click(screen.getByTestId("download-action-file1.txt"))

      expect(startObjectDownloadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "download",
          projectId: "test-project",
          bucketName: "test-bucket",
          objectKey: "file1.txt",
          filename: "file1.txt",
          onError: expect.any(Function),
        })
      )
    })

    it("wires the store's onError back to onDownloadError", async () => {
      const user = userEvent.setup()
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))
      await user.click(screen.getByTestId("download-action-file1.txt"))

      // The store reports a failure through the onError callback it was handed.
      const { onError } = startObjectDownloadMock.mock.calls[0][0]
      onError("file1.txt", "boom")
      expect(defaultProps.onDownloadError).toHaveBeenCalledWith("file1.txt", "boom")
    })

    it("row-click starts a 'preview' transfer via the store", async () => {
      const user = userEvent.setup()
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      // The button's accessible name is its visible text content (the filename).
      await user.click(screen.getByRole("button", { name: "file1.txt" }))

      expect(startObjectDownloadMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "preview", objectKey: "file1.txt" })
      )
    })

    it("fires the 'downloading' toast when a download starts", async () => {
      const user = userEvent.setup()
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))
      await user.click(screen.getByTestId("download-action-file1.txt"))

      expect(toast).toHaveBeenCalledWith(transMessage(/^Downloading/), expect.anything())
    })

    it("subscribes to watchDownloadProgress scoped to the row's downloadId and renders live progress", async () => {
      // Live progress comes from the subscription hook; the row is shown as
      // streaming because the store reports an active transfer for it.
      useSubscriptionMock.mockImplementation(() => ({ data: { downloaded: 5, total: 10, percent: 50 } }))

      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)
      setActiveTransfer("test-bucket", "file1.txt", "download", "test-bucket:file1.txt:uuid-1")

      const row = screen.getByTestId("object-row-file1.txt")
      await waitFor(() => expect(within(row).getByText("50%")).toBeInTheDocument())

      // The hook must be scoped to this row's own downloadId and the project.
      type SubscriptionCall = [{ project_id: string; downloadId: string }, { enabled: boolean }]
      const calls = useSubscriptionMock.mock.calls as unknown as SubscriptionCall[]
      const call = calls.find(([input]) => input?.downloadId === "test-bucket:file1.txt:uuid-1")
      expect(call).toBeDefined()
      expect(call?.[0]).toMatchObject({ project_id: "test-project" })
      expect(call?.[1]).toMatchObject({ enabled: true })
    })

    it("shows a cancel button while a transfer is in flight, and clicking it cancels via the store", async () => {
      const transfer = { kind: "download" as const, downloadId: "test-bucket:file1.txt:uuid-1", worker: {} }
      // handleCancelTransfer only toasts when the store confirms a live transfer.
      cancelObjectDownloadMock.mockReturnValue(transfer)

      const user = userEvent.setup()
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)
      setActiveTransfer("test-bucket", "file1.txt", "download", transfer.downloadId)

      const cancelButton = await screen.findByTestId("cancel-transfer-file1.txt")
      // The cancel control must be operable without a mouse: a real <button>
      // with an accessible name, not a clickable <div>/<span>.
      expect(cancelButton.tagName).toBe("BUTTON")
      expect(cancelButton).toHaveAccessibleName("Cancel")

      await user.click(cancelButton)

      expect(cancelObjectDownloadMock).toHaveBeenCalledWith("test-bucket", "file1.txt")
      // A user-initiated cancellation is confirmed with a toast, not an error.
      expect(toast.warning).toHaveBeenCalledWith(transMessage("Download Cancelled"), expect.anything())
      expect(defaultProps.onDownloadError).not.toHaveBeenCalled()
    })

    it("does not cancel in-flight transfers on unmount (downloads survive navigation)", async () => {
      // The store owns workers outside React precisely so a download keeps
      // running when this component unmounts (e.g. ObjectBrowserView swaps in a
      // spinner while a folder loads). Unmounting must NOT cancel anything.
      const { unmount } = render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)
      setActiveTransfer("test-bucket", "file1.txt", "download", "test-bucket:file1.txt:uuid-1")

      unmount()

      expect(cancelObjectDownloadMock).not.toHaveBeenCalled()
    })

    it("disables the row name button while that row is streaming", async () => {
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      const nameButton = () => screen.getByRole("button", { name: "file1.txt" })
      expect(nameButton()).not.toBeDisabled()

      setActiveTransfer("test-bucket", "file1.txt", "preview", "test-bucket:file1.txt:uuid-1")
      await waitFor(() => expect(nameButton()).toBeDisabled())
    })

    it("disables all row actions while that row is streaming, not just Download", async () => {
      const user = userEvent.setup()
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)
      setActiveTransfer("test-bucket", "file1.txt", "download", "test-bucket:file1.txt:uuid-1")

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))

      // Tolerant of how the menu item renders "disabled" (native attribute or
      // aria-disabled) — the point is the action can't be taken mid-transfer.
      const expectDisabled = (el: HTMLElement) => {
        const target = el.closest("button") ?? el
        expect(target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true").toBe(true)
      }

      expectDisabled(screen.getByTestId("download-action-file1.txt"))
      for (const label of ["Copy", "Move/Rename", "Edit Metadata", "Delete"]) {
        expectDisabled(screen.getByText(label))
      }
    })

    it("tracks concurrent transfers independently — each row reflects its own transfer", async () => {
      render(<ObjectsTableView {...defaultProps} folders={[]} />)

      const buttonA = () => screen.getByRole("button", { name: "file1.txt" })
      const buttonB = () => screen.getByRole("button", { name: "file2.pdf" })

      setActiveTransfer("test-bucket", "file1.txt", "preview", "test-bucket:file1.txt:uuid-a")
      setActiveTransfer("test-bucket", "file2.pdf", "preview", "test-bucket:file2.pdf:uuid-b")
      await waitFor(() => {
        expect(buttonA()).toBeDisabled()
        expect(buttonB()).toBeDisabled()
      })

      // Clearing A's transfer must leave B untouched.
      act(() => {
        const next = new Map(storeState.snapshot)
        next.delete("test-bucket:file1.txt")
        storeState.snapshot = next
        storeState.listeners.forEach((l) => l())
      })
      await waitFor(() => expect(buttonA()).not.toBeDisabled())
      expect(buttonB()).toBeDisabled()
    })

    it("does not allow row-click preview/download for version rows (versionId would be dropped)", async () => {
      // The download contract only accepts an objectKey, not a versionId. A
      // version row cast to ObjectRow and downloaded via the object-only path
      // would silently fetch the *current* object at that key rather than the
      // specific historical version the user clicked — so it must be inert
      // until a version-aware download endpoint exists.
      const user = userEvent.setup()
      const versions = [
        {
          key: "file1.txt",
          versionId: "v-123",
          isLatest: false,
          isDeleteMarker: false,
          isDeleted: false,
          size: 512,
          lastModified: "2024-01-10T10:00:00Z",
        },
      ]

      render(
        <ObjectsTableView {...defaultProps} folders={[]} objects={[]} versions={versions} showingVersions={true} />
      )

      const nameButton = screen.getByRole("button", { name: "file1.txt" })
      expect(nameButton).toBeDisabled()

      await user.click(nameButton)
      expect(startObjectDownloadMock).not.toHaveBeenCalled()
    })

    it("does not allow the context-menu Download action for version rows", async () => {
      const user = userEvent.setup()
      const versions = [
        {
          key: "file1.txt",
          versionId: "v-123",
          isLatest: false,
          isDeleteMarker: false,
          isDeleted: false,
          size: 512,
          lastModified: "2024-01-10T10:00:00Z",
        },
      ]

      render(
        <ObjectsTableView {...defaultProps} folders={[]} objects={[]} versions={versions} showingVersions={true} />
      )

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))
      await user.click(screen.getByTestId("download-action-file1.txt"))

      // No onClick is attached for version rows, so the click is a no-op.
      expect(startObjectDownloadMock).not.toHaveBeenCalled()
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
