---
"@cobaltcore-dev/aurora": minor
---

Ceph object storage: object downloads and previews can now be cancelled while
in flight. The abort signal is propagated from the frontend through the BFF, so
cancelling tears down the request instead of letting it run in the background.
A toast is shown when a download starts, and a warning toast confirms when one
is cancelled.
