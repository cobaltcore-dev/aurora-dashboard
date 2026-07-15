// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// The store raises/dismisses the shared "Downloading..." toast itself, so both
// the notifier and the copy helper are mocked here.
const { toastMock } = vi.hoisted(() => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  })
  return { toastMock: fn }
})

vi.mock("@cloudoperators/juno-ui-components", () => ({ toast: toastMock }))

// The store only reads what it has to hand to the worker — the resolved BFF
// endpoint and the cached CSRF token. Mocked so the test doesn't construct a
// real tRPC client; mutable so tests can vary both.
const { trpcMock } = vi.hoisted(() => ({
  trpcMock: { bffEndpoint: "/custom-bff", csrfToken: "tok-abc" as string | null },
}))
vi.mock("@/client/trpcClient", () => ({
  getBffEndpoint: () => trpcMock.bffEndpoint,
  getCsrfToken: () => trpcMock.csrfToken,
}))
vi.mock("../ObjectToastNotifications", () => ({
  getObjectDownloadStartedToast: () => ({ message: "Downloading...", description: "desc" }),
}))

// A controllable stand-in for the worker constructor. The store imports the
// worker via Vite's ?worker&inline, so the constructor comes from that module —
// mock the module, not the global Worker. Tests drive replies via
// emitMessage/emitError.
const { MockWorker } = vi.hoisted(() => {
  class MockWorker {
    static instances: MockWorker[] = []
    static throwOnConstruct = false
    onmessage: ((e: MessageEvent) => void) | null = null
    onerror: ((e: { message: string }) => void) | null = null
    posted: unknown[] = []
    terminated = false
    constructor() {
      if (MockWorker.throwOnConstruct) throw new Error("no workers")
      MockWorker.instances.push(this)
    }
    postMessage(msg: unknown) {
      this.posted.push(msg)
    }
    terminate() {
      this.terminated = true
    }
    emitMessage(data: unknown) {
      this.onmessage?.({ data } as MessageEvent)
    }
    emitError(message: string) {
      this.onerror?.({ message })
    }
  }
  return { MockWorker }
})

vi.mock("../workers/objectDownload.worker?worker&inline", () => ({ default: MockWorker }))

// The store keeps module-scope state (the transfers Map), so each test gets a
// fresh module via resetModules + dynamic import to avoid cross-test leakage.
type StoreModule = typeof import("./objectDownloadStore")
let store: StoreModule

const clicked: Array<{ href: string; target: string; download: string }> = []

beforeEach(async () => {
  MockWorker.instances = []
  MockWorker.throwOnConstruct = false
  trpcMock.bffEndpoint = "/custom-bff"
  trpcMock.csrfToken = "tok-abc"
  clicked.length = 0
  toastMock.mockClear()
  toastMock.dismiss.mockClear()
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ href: this.href, target: this.target, download: this.download })
  })

  vi.resetModules()
  store = await import("./objectDownloadStore")
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const start = (over: Partial<Parameters<StoreModule["startObjectDownload"]>[0]> = {}) => {
  const onError = vi.fn()
  store.startObjectDownload({
    kind: "download",
    projectId: "p",
    bucketName: "b",
    objectKey: "k.zip",
    filename: "k.zip",
    onError,
    ...over,
  })
  return { onError, worker: MockWorker.instances.at(-1)! }
}

describe("objectDownloadStore", () => {
  it("spawns a worker and posts a start message with a scoped downloadId", () => {
    const { worker } = start()

    expect(MockWorker.instances).toHaveLength(1)
    const msg = worker.posted[0] as { type: string; downloadId: string; objectKey: string }
    expect(msg).toMatchObject({ type: "start", projectId: "p", bucketName: "b", objectKey: "k.zip" })
    expect(msg.downloadId.startsWith("b:k.zip:")).toBe(true)
  })

  // Everything the worker can't work out for itself has to travel in the start
  // message: it has its own module instance of trpcClient, so it sees neither
  // App's setBffEndpoint() call nor the token cache the main thread has already
  // filled — and it runs from a blob: URL, so it can't resolve a relative URL
  // either. Each of these was a live bug.
  describe("the start message", () => {
    it("carries the app's resolved BFF endpoint, made absolute", () => {
      // Relative would leave the worker resolving against a blob: location,
      // whose opaque path throws "Failed to parse URL".
      const { worker } = start()
      expect(worker.posted[0]).toMatchObject({ bffEndpoint: `${location.origin}/custom-bff` })
    })

    it("passes an already-absolute endpoint through unchanged", () => {
      trpcMock.bffEndpoint = "https://bff.example.com/polaris-bff"
      const { worker } = start()
      expect(worker.posted[0]).toMatchObject({ bffEndpoint: "https://bff.example.com/polaris-bff" })
    })

    it("carries the main thread's cached CSRF token", () => {
      // Without it the worker's own cache is empty, it sends no x-csrf-token,
      // and the BFF rejects the download with "Invalid csrf token".
      const { worker } = start()
      expect(worker.posted[0]).toMatchObject({ csrfToken: "tok-abc" })
    })

    it("carries a null token when the main thread has none yet", () => {
      // Not an error: the worker resolves one itself against the absolute
      // endpoint above. The field must still be present and explicit.
      trpcMock.csrfToken = null
      const { worker } = start()
      expect(worker.posted[0]).toMatchObject({ csrfToken: null })
    })
  })

  it("exposes the active transfer in the snapshot and notifies subscribers", () => {
    const listener = vi.fn()
    store.subscribeTransfers(listener)

    start()

    expect(listener).toHaveBeenCalled()
    const transfer = store.getTransfersSnapshot().get(store.transferKey("b", "k.zip"))
    expect(transfer).toMatchObject({ kind: "download" })
  })

  it("ignores a second start for a row already transferring", () => {
    start()
    start()
    expect(MockWorker.instances).toHaveLength(1)
  })

  it("saves the file on a successful 'download' transfer, then clears + terminates", () => {
    const { worker } = start({ kind: "download" })

    worker.emitMessage({ ok: true, blob: new Blob(["x"]), filename: "k.zip", contentType: "application/zip" })

    expect(clicked).toHaveLength(1)
    expect(clicked[0]).toMatchObject({ href: "blob:mock", download: "k.zip", target: "" })
    expect(store.getTransfersSnapshot().get(store.transferKey("b", "k.zip"))).toBeUndefined()
    expect(worker.terminated).toBe(true)
  })

  it("opens a new tab for a 'preview' transfer when the type is previewable", () => {
    const { worker } = start({ kind: "preview", objectKey: "doc.pdf", filename: "doc.pdf" })

    worker.emitMessage({ ok: true, blob: new Blob(["x"]), filename: "doc.pdf", contentType: "application/pdf" })

    expect(clicked).toHaveLength(1)
    expect(clicked[0]).toMatchObject({ href: "blob:mock", target: "_blank" })
  })

  it("downloads a 'preview' transfer when the type is not previewable", () => {
    const { worker } = start({ kind: "preview", objectKey: "a.zip", filename: "a.zip" })

    worker.emitMessage({ ok: true, blob: new Blob(["x"]), filename: "a.zip", contentType: "application/zip" })

    expect(clicked).toHaveLength(1)
    expect(clicked[0]).toMatchObject({ download: "a.zip", target: "" })
  })

  it("routes a worker error to onError (and not a save)", () => {
    const { worker, onError } = start()

    worker.emitMessage({ ok: false, cancelled: false, message: "boom" })

    expect(onError).toHaveBeenCalledWith("k.zip", "boom")
    expect(clicked).toHaveLength(0)
    expect(store.getTransfersSnapshot().get(store.transferKey("b", "k.zip"))).toBeUndefined()
  })

  it("does not treat a cancelled reply as an error", () => {
    const { worker, onError } = start()

    worker.emitMessage({ ok: false, cancelled: true, message: "aborted" })

    expect(onError).not.toHaveBeenCalled()
    expect(clicked).toHaveLength(0)
  })

  it("cancelObjectDownload posts cancel, drops the entry, and returns the transfer", () => {
    const { worker } = start()

    const transfer = store.cancelObjectDownload("b", "k.zip")

    expect(transfer).toBeDefined()
    expect(worker.posted).toContainEqual({ type: "cancel" })
    expect(store.getTransfersSnapshot().get(store.transferKey("b", "k.zip"))).toBeUndefined()
  })

  it("cancelObjectDownload returns undefined for an unknown transfer", () => {
    expect(store.cancelObjectDownload("b", "missing")).toBeUndefined()
  })

  it("force-terminates a cancelled worker that never reports back", () => {
    vi.useFakeTimers()
    const { worker } = start()

    store.cancelObjectDownload("b", "k.zip")
    // Cooperative first: the worker is asked to abort and gets a grace period to
    // unwind on its own.
    expect(worker.posted).toContainEqual({ type: "cancel" })
    expect(worker.terminated).toBe(false)

    // It never replies — without the fallback it would keep streaming and
    // buffering a file nobody wants, unreachable from `transfers`.
    vi.advanceTimersByTime(5000)
    expect(worker.terminated).toBe(true)
  })

  it("the force-terminate fallback is harmless once the worker already replied", () => {
    vi.useFakeTimers()
    const { worker } = start()

    store.cancelObjectDownload("b", "k.zip")
    worker.emitMessage({ ok: false, cancelled: true, message: "aborted" })
    expect(worker.terminated).toBe(true)

    // terminate() is idempotent — the pending timer must not throw or resurrect
    // any state.
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow()
    expect(store.getTransfersSnapshot().size).toBe(0)
  })

  it("ignores a late reply from a cancelled worker (no save)", () => {
    const { worker } = start()
    store.cancelObjectDownload("b", "k.zip")

    // The worker finishes its abort and replies after cancel — must be ignored.
    worker.emitMessage({ ok: true, blob: new Blob(["x"]), filename: "k.zip", contentType: "application/zip" })

    expect(clicked).toHaveLength(0)
    expect(worker.terminated).toBe(true)
  })

  it("ignores a late reply from a worker superseded by a new transfer for the same row", () => {
    const first = start()
    store.cancelObjectDownload("b", "k.zip")
    // Cancelling frees the row, so the user can immediately start it again.
    const second = start()
    expect(second.worker).not.toBe(first.worker)

    // The superseded worker finally finishes and replies. It must not save the
    // file, and must not disturb the transfer that replaced it — this is the
    // "slot taken by someone else" half of the staleness guard, distinct from the
    // "slot empty" case above.
    first.worker.emitMessage({ ok: true, blob: new Blob(["x"]), filename: "k.zip", contentType: "application/zip" })

    expect(clicked).toHaveLength(0)
    expect(first.worker.terminated).toBe(true)
    expect(store.getTransfersSnapshot().get(store.transferKey("b", "k.zip"))?.worker).toBe(second.worker)
    expect(second.worker.terminated).toBe(false)
  })

  it("errors through onError when the worker constructor throws", () => {
    MockWorker.throwOnConstruct = true
    const onError = vi.fn()
    store.startObjectDownload({
      kind: "download",
      projectId: "p",
      bucketName: "b",
      objectKey: "k.zip",
      filename: "k.zip",
      onError,
    })
    expect(onError).toHaveBeenCalledWith("k.zip", "no workers")
    expect(store.getTransfersSnapshot().get(store.transferKey("b", "k.zip"))).toBeUndefined()
  })

  describe("the shared 'Downloading...' toast", () => {
    it("is raised once for the first transfer and not repeated for further ones", () => {
      start({ objectKey: "a.zip", filename: "a.zip" })
      expect(toastMock).toHaveBeenCalledTimes(1)
      expect(toastMock).toHaveBeenCalledWith(
        "Downloading...",
        expect.objectContaining({ id: "ceph-object-download", duration: Infinity })
      )

      // A second concurrent download must not stack another notification.
      start({ objectKey: "b.zip", filename: "b.zip" })
      expect(toastMock).toHaveBeenCalledTimes(1)
    })

    it("is dismissed only once the last transfer ends", () => {
      const a = start({ objectKey: "a.zip", filename: "a.zip" })
      const b = start({ objectKey: "b.zip", filename: "b.zip" })

      a.worker.emitMessage({ ok: true, blob: new Blob(["x"]), filename: "a.zip", contentType: "application/zip" })
      // b is still running — the toast must stay up.
      expect(toastMock.dismiss).not.toHaveBeenCalled()

      b.worker.emitMessage({ ok: true, blob: new Blob(["x"]), filename: "b.zip", contentType: "application/zip" })
      expect(toastMock.dismiss).toHaveBeenCalledWith("ceph-object-download")
    })

    it("is dismissed when the last transfer fails", () => {
      const { worker } = start()
      worker.emitMessage({ ok: false, cancelled: false, message: "boom" })
      expect(toastMock.dismiss).toHaveBeenCalledWith("ceph-object-download")
    })

    it("is dismissed when the last transfer is cancelled", () => {
      start()
      store.cancelObjectDownload("b", "k.zip")
      expect(toastMock.dismiss).toHaveBeenCalledWith("ceph-object-download")
    })

    it("is raised again after a later transfer starts", () => {
      const first = start()
      first.worker.emitMessage({ ok: true, blob: new Blob(["x"]), filename: "k.zip", contentType: "application/zip" })
      expect(toastMock).toHaveBeenCalledTimes(1)

      start({ objectKey: "c.zip", filename: "c.zip" })
      expect(toastMock).toHaveBeenCalledTimes(2)
    })
  })

  describe("isPreviewableContentType", () => {
    it("previews pdf, text, images, video, audio", () => {
      for (const ct of ["application/pdf", "text/plain", "image/png", "video/mp4", "audio/mpeg"]) {
        expect(store.isPreviewableContentType(ct)).toBe(true)
      }
    })
    it("does not preview scriptable types or svg or unknown binaries", () => {
      for (const ct of ["text/html", "application/json", "image/svg+xml", "application/octet-stream"]) {
        expect(store.isPreviewableContentType(ct)).toBe(false)
      }
    })
    it("ignores charset parameters", () => {
      expect(store.isPreviewableContentType("text/plain; charset=utf-8")).toBe(true)
    })
  })
})
