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
import { getBffEndpoint } from "@/client/trpcClient"
import type { DownloadWorkerRequest, DownloadWorkerResponse } from "../workers/objectDownload.worker"
import { getObjectDownloadStartedToast } from "../ObjectToastNotifications"

export type TransferKind = "download" | "preview"
export type ActiveTransfer = { kind: TransferKind; downloadId: string; worker: Worker }

// Keyed by transferKey() — bucket-scoped so the same object key in two buckets
// can't collide.
const transfers = new Map<string, ActiveTransfer>()
const listeners = new Set<() => void>()

// useSyncExternalStore requires getSnapshot to return a stable reference between
// changes, so we hand out a frozen copy that's only rebuilt on mutation.
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
    // Module worker — the bundler pulls the tRPC client into the worker chunk.
    worker = new Worker(new URL("../workers/objectDownload.worker.ts", import.meta.url), { type: "module" })
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
    bffEndpoint: getBffEndpoint(),
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
// from S3. The worker isn't terminated here — it unwinds its own abort and is
// dropped once idle, avoiding a mid-stream hard kill.
//
// Returns the cancelled transfer (or undefined if the row wasn't transferring) so
// the caller can tell a real cancellation apart from a no-op.
export function cancelObjectDownload(bucketName: string, objectKey: string): ActiveTransfer | undefined {
  const key = transferKey(bucketName, objectKey)
  const transfer = transfers.get(key)
  if (!transfer) return undefined

  transfer.worker.postMessage({ type: "cancel" } satisfies DownloadWorkerRequest)
  transfers.delete(key)
  emit()
  return transfer
}
