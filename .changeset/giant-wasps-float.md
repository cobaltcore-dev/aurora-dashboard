---
"@cobaltcore-dev/aurora": minor
---

Add pre-signed URL sharing for Ceph (S3) objects. Eligible object rows now have a "Share URL" action that opens a modal to generate a time-limited download link — with 1 hour / 24 hour / 7 day presets or a custom duration (capped at the S3 maximum of 7 days). The link can be copied and shared without Aurora credentials, and the modal shows when it expires.
