/// <reference lib="webworker" />
//
// Dedicated module worker for Ceph object downloads.
//
// Why a worker: for large objects the wire carries a lot of base64 text and
// `Uint8Array.from(atob(chunk), …)` runs over all of it. Doing that on the main
// thread janks the UI; here it runs off-thread and the main thread only receives
// the finished Blob.
//
// Reuses the app's existing `trpcClient` (same links / CSRF / streaming routing)
// instead of building a separate client — no config duplication or drift.
//
// Cancellation: a "cancel" message aborts the AbortController passed to the tRPC
// mutation, which stops the read here and tears down the request so the BFF stops
// reading too. The store drops the transfer from its state right away, so the UI
// doesn't wait on this unwinding.
//
// What stays on the main thread: all DOM work (anchor download / open-in-tab) and
// the watchDownloadProgress subscription (a React hook keyed by downloadId).
//
// Must be instantiated as a module worker so the bundler pulls the client in:
//   new Worker(new URL("../workers/objectDownload.worker.ts", import.meta.url), { type: "module" })

import { trpcClient } from "@/client/trpcClient"

export type DownloadWorkerRequest =
  | {
      type: "start"
      projectId: string
      bucketName: string
      objectKey: string
      filename: string
      downloadId: string
    }
  | { type: "cancel" }

export type DownloadWorkerResponse =
  | { ok: true; blob: Blob; filename: string; contentType: string }
  | { ok: false; cancelled: boolean; message: string }

let abortController: AbortController | null = null

self.addEventListener("message", async (event: MessageEvent<DownloadWorkerRequest>) => {
  const msg = event.data

  // A cancel can arrive while a download is in flight — abort the tRPC call so
  // its `for await` throws and we fall into the catch below (cancelled=true).
  if (msg.type === "cancel") {
    abortController?.abort()
    return
  }

  abortController = new AbortController()

  let contentType = "application/octet-stream"
  let filename = msg.filename
  // Typed as Uint8Array<ArrayBuffer> (not the default Uint8Array<ArrayBufferLike>)
  // so `new Blob(chunks, …)` accepts them — Blob rejects SharedArrayBuffer-backed
  // views, which ArrayBufferLike would allow.
  const chunks: Uint8Array<ArrayBuffer>[] = []

  try {
    const iterable = await trpcClient.storage.ceph.objects.downloadObject.mutate(
      {
        project_id: msg.projectId,
        containerName: msg.bucketName,
        objectKey: msg.objectKey,
        filename: msg.filename,
        downloadId: msg.downloadId,
      },
      { signal: abortController.signal }
    )

    for await (const { chunk, contentType: ct, filename: fn } of iterable) {
      if (ct) contentType = ct
      if (fn) filename = fn
      chunks.push(Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>)
    }

    const blob = new Blob(chunks, { type: contentType })
    // Blob is structured-cloneable by reference — no byte copy across the boundary.
    self.postMessage({ ok: true, blob, filename, contentType } satisfies DownloadWorkerResponse)
  } catch (err) {
    self.postMessage({
      ok: false,
      cancelled: abortController.signal.aborted,
      message: err instanceof Error ? err.message : String(err),
    } satisfies DownloadWorkerResponse)
  }
})
