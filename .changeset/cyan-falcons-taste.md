---
"@cobaltcore-dev/aurora": minor
---

Integrate Juno NotificationManager and replace legacy `<Toast>` notifications across the Swift object-storage UI. Container and object notifications (create, delete, empty, ACL/metadata, upload, download, copy, move, folder operations, temporary URL, and bulk actions) now fire through the centralized NotificationManager (`toast.success` / `toast.error` / `toast.warning`) for consistent placement, lifetime, and dismissal. Notification builders return `{ message, description }` instead of the legacy `{ variant, children }` toast props; the container bulk-empty builder additionally returns a `severity` so the caller dispatches the correct toast style from a single source of truth.
