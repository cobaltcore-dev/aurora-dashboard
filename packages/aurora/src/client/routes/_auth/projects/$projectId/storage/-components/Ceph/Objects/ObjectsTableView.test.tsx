import { render as rtlRender, screen, within, waitFor } from "@testing-library/react"
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
const { downloadObjectMutate, useSubscriptionMock } = vi.hoisted(() => ({
  downloadObjectMutate: vi.fn(),
  useSubscriptionMock: vi.fn((): { data: { downloaded: number; total: number; percent: number } | undefined } => ({
    data: undefined,
  })),
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

// The component calls toast(...) directly for the "download started"
// notification (a neutral/base call, not .success/.error/.warning), so the
// mock needs the base export itself to be a spy — not just its sub-methods.
vi.mock("@cloudoperators/juno-ui-components", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cloudoperators/juno-ui-components")>()
  const toastFn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
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
  // vi.restoreAllMocks() also resets the hoisted useSubscriptionMock/
  // downloadObjectMutate vi.fn()s (they have no "original" to restore to, so
  // restoring clears their implementation) — re-establish useSubscriptionMock's
  // default here so components that read live progress don't crash on the
  // next test after one that customized it.
  beforeEach(() => {
    useSubscriptionMock.mockImplementation(() => ({ data: undefined }))
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
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    it("row-click previews in a new tab when Content-Type is previewable", async () => {
      const user = userEvent.setup()
      const clicked: Array<{ href: string; target: string; download: string }> = []
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ href: this.href, target: this.target, download: this.download })
      })
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

      // The button's accessible name is its visible text content (the filename),
      // not the title attribute.
      await user.click(screen.getByRole("button", { name: "photo.jpg" }))

      await waitFor(() => expect(clicked).toHaveLength(1))
      expect(clicked[0]).toMatchObject({ href: "blob:preview", target: "_blank" })
    })

    it("row-click previews text files in a new tab", async () => {
      const user = userEvent.setup()
      const clicked: Array<{ href: string; target: string }> = []
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ href: this.href, target: this.target })
      })
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

      // text/plain — previewable (default mock from beforeEach)
      const obj = [{ key: "notes.txt", size: 1024, lastModified: "2024-01-15T10:00:00Z" }]
      render(<ObjectsTableView {...defaultProps} folders={[]} objects={obj} />)

      await user.click(screen.getByRole("button", { name: "notes.txt" }))

      await waitFor(() => expect(clicked).toHaveLength(1))
      expect(clicked[0]).toMatchObject({ href: "blob:preview", target: "_blank" })
    })

    it("row-click downloads when Content-Type is not previewable", async () => {
      const user = userEvent.setup()
      const clicked: Array<{ href: string; target: string; download: string }> = []
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ href: this.href, target: this.target, download: this.download })
      })
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

      await user.click(screen.getByRole("button", { name: "archive.zip" }))

      await waitFor(() => expect(downloadObjectMutate).toHaveBeenCalled())
      // Non-previewable: a download anchor is clicked (no target="_blank")
      await waitFor(() => expect(clicked).toHaveLength(1))
      expect(clicked[0]).toMatchObject({ href: "blob:download", download: "archive.zip" })
      expect(clicked[0].target).toBe("")
    })

    it("row-click downloads when BFF returns octet-stream (unknown type)", async () => {
      const user = userEvent.setup()
      const clicked: Array<{ href: string; target: string; download: string }> = []
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ href: this.href, target: this.target, download: this.download })
      })
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

      await user.click(screen.getByRole("button", { name: "a1b2-uuid" }))

      await waitFor(() => expect(clicked).toHaveLength(1))
      expect(clicked[0]).toMatchObject({ href: "blob:download", download: "a1b2-uuid" })
      expect(clicked[0].target).toBe("")
    })

    it("subscribes to watchDownloadProgress scoped to the row's downloadId and renders live progress", async () => {
      const user = userEvent.setup()
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

      // Stall the stream after the first chunk so the row stays in the
      // "streaming" state long enough to assert on the subscription and the
      // rendered progress UI, then release it at the end of the test.
      let releaseStream: () => void = () => {}
      const stalled = new Promise<void>((resolve) => {
        releaseStream = resolve
      })
      downloadObjectMutate.mockImplementationOnce(async () => {
        async function* gen() {
          yield { chunk: btoa("a"), downloaded: 1, total: 2, contentType: "text/plain", filename: "file1.txt" }
          await stalled
          yield { chunk: btoa("b"), downloaded: 2, total: 2 }
        }
        return gen()
      })

      // Simulate the BFF pushing a live progress update once subscribed.
      useSubscriptionMock.mockImplementation(() => ({ data: { downloaded: 5, total: 10, percent: 50 } }))

      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))
      await user.click(screen.getByTestId("download-action-file1.txt"))

      // The percentage text should come from the (mocked) live subscription
      // data, proving RowTransferProgress actually renders what the hook returns.
      await waitFor(() => expect(within(row).getByText("50%")).toBeInTheDocument())

      // The hook must be called scoped to this row's own downloadId and the
      // current project — not some stale/shared value.
      //
      // useSubscriptionMock's inferred call signature is based on its hoisted
      // default implementation `() => ({ data: undefined })`, which takes no
      // arguments — so `mock.calls` types as an empty tuple. Cast locally to
      // the shape it's actually called with by RowTransferProgress.
      type SubscriptionCall = [{ project_id: string; downloadId: string }, { enabled: boolean }]
      const calls = useSubscriptionMock.mock.calls as unknown as SubscriptionCall[]
      const call = calls.find(([input]) => input?.downloadId?.startsWith("test-bucket:file1.txt:"))
      expect(call).toBeDefined()
      expect(call?.[0]).toMatchObject({ project_id: "test-project" })
      expect(call?.[1]).toMatchObject({ enabled: true })

      releaseStream()
      await waitFor(() => expect(within(row).queryByText("50%")).not.toBeInTheDocument())
    })

    it("fires the 'downloading' toast when a download starts", async () => {
      const user = userEvent.setup()
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)

      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))
      await user.click(screen.getByTestId("download-action-file1.txt"))

      await waitFor(() => expect(toast).toHaveBeenCalledWith(transMessage(/^Downloading/), expect.anything()))
    })

    it("shows a cancel button while a transfer is in flight, and clicking it aborts the request", async () => {
      const user = userEvent.setup()
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

      let capturedSignal: AbortSignal | undefined
      let releaseGate!: () => void
      const gate = new Promise<void>((resolve) => {
        releaseGate = resolve
      })
      downloadObjectMutate.mockImplementationOnce(async (_input, options: { signal?: AbortSignal }) => {
        capturedSignal = options?.signal
        async function* gen() {
          yield { chunk: btoa("a"), downloaded: 1, total: 2, contentType: "text/plain", filename: "file1.txt" }
          await gate
          if (capturedSignal?.aborted) {
            const abortError = new Error("Request canceled")
            abortError.name = "AbortError"
            throw abortError
          }
          yield { chunk: btoa("b"), downloaded: 2, total: 2 }
        }
        return gen()
      })

      render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)
      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))
      await user.click(screen.getByTestId("download-action-file1.txt"))

      const cancelButton = await screen.findByTestId("cancel-transfer-file1.txt")
      // The cancel control must be operable without a mouse: a real <button>
      // with an accessible name, not a clickable <div>/<span>.
      expect(cancelButton.tagName).toBe("BUTTON")
      expect(cancelButton).toHaveAccessibleName("Cancel")

      await user.click(cancelButton)

      expect(capturedSignal?.aborted).toBe(true)

      releaseGate()

      // A user-initiated cancellation is not an error — it is confirmed with a
      // toast, and onDownloadError must not fire for it.
      await waitFor(() => expect(screen.queryByTestId("cancel-transfer-file1.txt")).not.toBeInTheDocument())
      await waitFor(() =>
        expect(toast.warning).toHaveBeenCalledWith(transMessage("Download Cancelled"), expect.anything())
      )
      expect(defaultProps.onDownloadError).not.toHaveBeenCalled()
    })

    it("aborts in-flight transfers when the component unmounts", async () => {
      // The point of forwarding the AbortSignal to the tRPC call: navigating
      // away mid-download must actually stop the request, not just ignore its
      // result while it keeps running (and competing for bandwidth/CPU) in
      // the background.
      const user = userEvent.setup()
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

      let capturedSignal: AbortSignal | undefined
      let releaseGate!: () => void
      const gate = new Promise<void>((resolve) => {
        releaseGate = resolve
      })
      // The stream must reject once the signal is aborted, exactly as it does in
      // the cancel test — otherwise it completes normally, handleTransferError()
      // is never reached, and the assertion below would pass for the wrong
      // reason (no error path taken) rather than because the isMounted guard
      // suppressed the toast.
      downloadObjectMutate.mockImplementationOnce(async (_input, options: { signal?: AbortSignal }) => {
        capturedSignal = options?.signal
        async function* gen() {
          yield { chunk: btoa("a"), downloaded: 1, total: 2, contentType: "text/plain", filename: "file1.txt" }
          await gate
          if (capturedSignal?.aborted) {
            const abortError = new Error("Request canceled")
            abortError.name = "AbortError"
            throw abortError
          }
          yield { chunk: btoa("b"), downloaded: 2, total: 2 }
        }
        return gen()
      })

      const { unmount } = render(<ObjectsTableView {...defaultProps} folders={[]} objects={[mockObjects[0]]} />)
      const row = screen.getByTestId("object-row-file1.txt")
      await user.click(within(row).getByRole("button", { name: /more/i }))
      await user.click(screen.getByTestId("download-action-file1.txt"))

      unmount()

      expect(capturedSignal?.aborted).toBe(true)

      releaseGate()

      // Let the aborted stream reject and handleTransferError() run before
      // asserting on what it did (and didn't) do.
      await waitFor(() => expect(defaultProps.onDownloadError).not.toHaveBeenCalled())
      await new Promise((resolve) => setTimeout(resolve, 0))

      // An unmount-triggered abort is not a user-initiated cancellation — the
      // component (and the page it lived on) is gone, so no toast is shown.
      expect(toast.warning).not.toHaveBeenCalled()
    })

    it("tracks two concurrent transfers independently — finishing one must not clear the other's state", async () => {
      // Regression test for a bug where a single shared piece of state tracked
      // the "active" row/downloadId. Starting a second transfer overwrote the
      // first's tracked row, and the first request's `finally` cleanup then
      // cleared state belonging to the still-running second request.
      const user = userEvent.setup()
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

      // Builds an async iterable whose second chunk only yields once an
      // external gate is resolved, so each stream's completion can be
      // controlled independently and interleaved from the test.
      const makeControllableStream = (contentType: string, filename: string) => {
        let resolveGate: () => void = () => {}
        const gate = new Promise<void>((resolve) => {
          resolveGate = resolve
        })
        async function* gen() {
          yield { chunk: btoa("a"), downloaded: 1, total: 2, contentType, filename }
          await gate
          yield { chunk: btoa("b"), downloaded: 2, total: 2 }
        }
        return { iterable: gen(), resolveGate: () => resolveGate() }
      }

      const streamA = makeControllableStream("text/plain", "file1.txt")
      const streamB = makeControllableStream("application/pdf", "file2.pdf")

      downloadObjectMutate.mockImplementation(async (input: { objectKey: string }) => {
        if (input.objectKey === "file1.txt") return streamA.iterable
        if (input.objectKey === "file2.pdf") return streamB.iterable
        throw new Error(`unexpected objectKey: ${input.objectKey}`)
      })

      render(<ObjectsTableView {...defaultProps} folders={[]} />)

      const buttonA = () => screen.getByRole("button", { name: "file1.txt" })
      const buttonB = () => screen.getByRole("button", { name: "file2.pdf" })

      // Start both row-click transfers; both stall mid-stream on their own gate.
      await user.click(buttonA())
      await user.click(buttonB())

      await waitFor(() => {
        expect(buttonA()).toBeDisabled()
        expect(buttonB()).toBeDisabled()
      })

      // Let A finish. B must remain untouched — still disabled/streaming.
      streamA.resolveGate()
      await waitFor(() => expect(buttonA()).not.toBeDisabled())
      expect(buttonB()).toBeDisabled()

      // Now finish B independently.
      streamB.resolveGate()
      await waitFor(() => expect(buttonB()).not.toBeDisabled())
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
      expect(downloadObjectMutate).not.toHaveBeenCalled()
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

      // No onClick is attached for version rows, so the click is a no-op
      // regardless of how the disabled state is rendered internally.
      expect(downloadObjectMutate).not.toHaveBeenCalled()
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
