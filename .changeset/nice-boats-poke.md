---
"@cobaltcore-dev/aurora": patch
---

Migrate Glance image notifications from the legacy Juno `<Toast>` component to the app-wide `NotificationManager` (`toast`) API, matching the Swift and Ceph storage views. Toast builders now return `{ message, ...options }` and callers dispatch severity directly (`toast.success` / `error` / `warning` / `info`); the per-screen toast state and `setToastData` plumbing are removed. Also hardens the image create/update/delete handlers against `undefined` error data (optional chaining on `error.data?.path` and null-safe error-message reads) so a failure can no longer throw inside its own `catch`.
