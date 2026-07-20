---
"@cobaltcore-dev/aurora": minor
---

Offload Ceph object downloads to a dedicated Web Worker.

Downloading or previewing an object no longer blocks the UI. The transfer and its base64 decoding run off the main thread, so the object table stays responsive while a large object streams.
Transfers are owned by a module-scope store rather than by the objects table. A download now survives folder navigation, spinner swaps, and leaving the bucket entirely — which is what the "download started" notification already promised the user. Concurrent transfers share a single persistent "Downloading…" notification, dismissed once the last one ends, however it ended: saved, failed, or cancelled.
Cancelling is cooperative: the row clears immediately, the worker is asked to abort its request so the BFF stops reading from S3, and it is force-terminated only if it never reports back.
Two notes for anyone embedding this package. The worker is bundled inline rather than emitted as a separate asset, so it survives being re-bundled by a consuming app — but an inline worker starts from a blob: URL, so a Content-Security-Policy must allow worker-src 'self' blob:. Aurora's own server now sets this; a consumer serving its own CSP needs the same. The library build also substitutes process.env.NODE_ENV, because the worker's bundled dependencies read it and a worker has no process to read it from.
