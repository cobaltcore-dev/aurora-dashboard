---
"@cobaltcore-dev/aurora": minor
---

Add object download and preview for Ceph object storage, bringing Ceph to parity with the existing Swift capability.

- Stream downloads through the BFF (`downloadObject`) with live progress tracking via `watchDownloadProgress`. Multiple downloads/previews can be in flight at once, each tracked and reported independently.
- Row-click on an object previews it in a new browser tab when the type is safely renderable (images excluding SVG, video, audio, PDF, and plain text); everything else downloads directly. Scriptable types (HTML, JSON, XML, SVG) are intentionally excluded from preview since they can execute active content when opened from a blob URL.
- New context-menu **Download** action always forces a file save, regardless of type.
- The BFF resolves a reliable MIME type from the object key extension when S3/Ceph reports a generic or incorrect `Content-Type` (e.g. the `binary/octet-stream` default, or values set by some upload tools), so files preview correctly even without proper upload metadata.
