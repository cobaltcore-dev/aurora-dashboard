// Module-scope registry of in-flight object downloads.
//
// Why this lives outside React: ObjectBrowserView swaps ObjectsTableView out for
// a <Spinner> whenever objects.list is loading (i.e. entering an uncached
// folder). That unmounts the table — and if the table owned the workers, its
// cleanup would abort them mid-stream ("stream closed prematurely") and lose the
// progress state. Owning transfers here means a download survives folder
// navigation, spinner swaps, and even leaving the bucket entirely — which is what
// the download-started toast already promises the user.
//
// Components read the transfer map via useSyncExternalStore(subscribe, getSnapshot)
// and re-render on change. The worker's onmessage callbacks run regardless of
// whether any component is mounted, so a download that finishes while the user is
// in another folder still saves the file.

import { toast } from "@cloudoperators/juno-ui-components"
import { getBffEndpoint, getCsrfToken } from "@/client/trpcClient"
import DownloadWorker from "../workers/objectDownload.worker?worker&inline"
import type { DownloadWorkerRequest, DownloadWorkerResponse } from "../workers/objectDownload.worker"
import { getObjectDownloadStartedToast } from "../ObjectToastNotifications"

export type TransferKind = "download" | "preview"
export type ActiveTransfer = { kind: TransferKind; downloadId: string; worker: Worker }

// Keyed by transferKey() — bucket-scoped so the same object key in two buckets
// can't collide.
const transfers = new Map<string, ActiveTransfer>()
const listeners = new Set<() => void>()

// useSyncExternalStore requires getSnapshot to return a stable reference between
// changes, so we hand out a copy that's only rebuilt on mutation.
let snapshot: ReadonlyMap<string, ActiveTransfer> = new Map()

// Fixed id so the "Downloading..." notification is a single toast for the whole
// session rather than one per file — sonner (which backs Juno's toast) treats a
// repeated id as an update, not a new notification.
const DOWNLOAD_TOAST_ID = "ceph-object-download"
let downloadToastShown = false

// Raise the toast when the first transfer starts, dismiss it when the last one
// ends — however it ended (saved, failed, or cancelled). Living in the store
// rather than in a component matters: the last transfer can finish while
// ObjectsTableView is unmounted (the user navigated away), and the toast must
// still be dismissed.
const syncDownloadToast = () => {
  const hasActiveTransfers = transfers.size > 0
  if (hasActiveTransfers && !downloadToastShown) {
    const { message, ...options } = getObjectDownloadStartedToast()
    // duration: Infinity — this toast is dismissed explicitly, not on a timer.
    toast(message, { ...options, id: DOWNLOAD_TOAST_ID, duration: Infinity })
    downloadToastShown = true
  } else if (!hasActiveTransfers && downloadToastShown) {
    toast.dismiss(DOWNLOAD_TOAST_ID)
    downloadToastShown = false
  }
}

const emit = () => {
  snapshot = new Map(transfers)
  syncDownloadToast()
  listeners.forEach((listener) => listener())
}

// How long a cancelled worker gets to report back before it is forced down.
//
// Normally it replies almost immediately — the abort rejects its `for await`,
// and the reply path terminates it. But that reply isn't guaranteed: if the
// abort ever fails to unwind the stream, the worker would keep downloading and
// buffering a file nobody wants, with no entry left in `transfers` to clean it
// up. This bounds that window.
const CANCEL_TERMINATE_GRACE_MS = 5000

export const transferKey = (bucketName: string, objectKey: string) => `${bucketName}:${objectKey}`

export const subscribeTransfers = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getTransfersSnapshot = (): ReadonlyMap<string, ActiveTransfer> => snapshot

// ── DOM helpers (main thread only — the worker has no document) ────────────────

const triggerAnchorDownload = (url: string, filename: string) => {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// Uses an anchor with target="_blank" rather than window.open — anchors aren't
// subject to the post-await popup-blocking window.open is, so the tab can be
// opened after streaming completes, only for files we know are previewable.
const openBlobInNewTab = (url: string) => {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.target = "_blank"
  anchor.rel = "noopener,noreferrer"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// MIME types safe to preview in a browser tab. Decided from the Content-Type the
// BFF actually returns (resolved server-side from the object key when S3 stores a
// generic default), not from the filename — so it works for UUID-keyed objects.
//
// NOTE: intentionally excludes scriptable types (text/html, application/json,
// application/xml) and SVG (can execute scripts when opened via blob URLs).
const BROWSER_PREVIEWABLE_MIME_TYPES = new Set(["application/pdf", "text/plain"])

export function isPreviewableContentType(contentType: string): boolean {
  const base = contentType.split(";")[0].trim().toLowerCase()
  if (BROWSER_PREVIEWABLE_MIME_TYPES.has(base)) return true
  if (base === "image/svg+xml") return false
  return base.startsWith("image/") || base.startsWith("video/") || base.startsWith("audio/")
}

// ── Transfer lifecycle ────────────────────────────────────────────────────────

export function startObjectDownload(opts: {
  kind: TransferKind
  projectId: string
  bucketName: string
  objectKey: string
  filename: string
  onError: (objectKey: string, message: string) => void
}): void {
  const { kind, projectId, bucketName, objectKey, filename, onError } = opts
  const key = transferKey(bucketName, objectKey)

  // Ignore a second start for a row that's already transferring.
  if (transfers.has(key)) return

  const downloadId = `${bucketName}:${objectKey}:${crypto.randomUUID()}`

  let worker: Worker
  try {
    // Inlined worker (Vite's ?worker&inline), NOT `new Worker(new URL(…))`.
    // Aurora ships as a library: a URL-referenced worker is emitted as a separate
    // asset and the reference is baked into our bundle as a plain string. The app
    // consuming this library re-bundles us, sees only that string, and never
    // copies the worker chunk into its own output — so the request 404s and lands
    // in the SPA fallback, which serves index.html and fails strict MIME checking
    // for module scripts. Inlining leaves no asset for a consumer to lose.
    worker = new DownloadWorker()
  } catch (err) {
    onError(objectKey, err instanceof Error ? err.message : "Failed to start download worker")
    return
  }

  transfers.set(key, { kind, downloadId, worker })
  emit()

  const finish = () => {
    // Only clear the entry we started — a newer transfer for the same row must
    // not be wiped by a stale one's cleanup. terminate() here is safe: the worker
    // has already reported back, so it's idle, never killed mid-stream.
    if (transfers.get(key)?.downloadId === downloadId) {
      transfers.delete(key)
      emit()
    }
    worker.terminate()
  }

  worker.onmessage = ({ data }: MessageEvent<DownloadWorkerResponse>) => {
    // A worker that was cancelled (or replaced) is no longer the row's transfer —
    // ignore its late reply so a download finishing at the moment of cancel
    // doesn't still save the file.
    if (transfers.get(key)?.worker !== worker) {
      worker.terminate()
      return
    }
    if (data.ok) {
      const url = URL.createObjectURL(data.blob)
      if (kind === "preview" && isPreviewableContentType(data.contentType)) {
        openBlobInNewTab(url)
      } else {
        triggerAnchorDownload(url, data.filename)
      }
    } else if (!data.cancelled) {
      onError(objectKey, data.message)
    }
    finish()
  }

  worker.onerror = (event) => {
    if (transfers.get(key)?.worker !== worker) {
      worker.terminate()
      return
    }
    onError(objectKey, event.message || "Download worker failed")
    finish()
  }

  worker.postMessage({
    type: "start",
    // The worker has its own module instance and never sees App's
    // setBffEndpoint() call — hand it the resolved endpoint explicitly.
    //
    // Absolute, not relative: the worker is inlined and therefore runs from a
    // blob: URL, whose location has an opaque path. Resolving "/polaris-bff"
    // against it throws ("Failed to parse URL"), so the endpoint has to carry its
    // own origin. An already-absolute endpoint passes through unchanged.
    bffEndpoint: new URL(getBffEndpoint(), location.origin).href,
    // Same story for CSRF: the worker's own token cache starts empty, and
    // fetching /csrf-token there is a round-trip we don't need. Null (nothing has
    // needed a token yet this session) is fine — the worker resolves one itself.
    csrfToken: getCsrfToken(),
    projectId,
    bucketName,
    objectKey,
    filename,
    downloadId,
  } satisfies DownloadWorkerRequest)
}

// Cancel an in-flight transfer. Removes it from the store immediately (so the UI
// clears on the very next render, with no worker round-trip) and tells the worker
// to abort its tRPC call, which tears down the request so the BFF stops reading
// from S3. The worker isn't terminated right away — it unwinds its own abort and
// is dropped once idle, avoiding a mid-stream hard kill; a grace-period timer
// forces it down if that never happens.
//
// Returns the cancelled transfer (or undefined if the row wasn't transferring) so
// callers can tell a real cancellation apart from a no-op.
export function cancelObjectDownload(bucketName: string, objectKey: string): ActiveTransfer | undefined {
  const key = transferKey(bucketName, objectKey)
  const transfer = transfers.get(key)
  if (!transfer) return undefined

  transfer.worker.postMessage({ type: "cancel" } satisfies DownloadWorkerRequest)
  // Safety net for a worker that never reports back (see
  // CANCEL_TERMINATE_GRACE_MS). terminate() is idempotent, so this is a no-op in
  // the normal case where the worker already replied and was terminated.
  setTimeout(() => transfer.worker.terminate(), CANCEL_TERMINATE_GRACE_MS)
  transfers.delete(key)
  emit()
  return transfer
}
