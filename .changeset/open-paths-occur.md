---
"@cobaltcore-dev/aurora": minor
---

Integrate Juno NotificationManager and replace legacy `<Toast>` notifications across the Ceph object-storage UI. Bucket, object, and credential-prompt notifications now fire through the centralized NotificationManager (`toast.success` / `toast.error` / `toast.warning`) for consistent placement, lifetime, and dismissal. Notification builders return `{ message, description }` instead of the legacy `{ variant, children }` toast props.
