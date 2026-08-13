---
"@cobaltcore-dev/aurora": minor
---

feat(portal): offload Swift object downloads to a Web Worker

Swift object downloads and previews now run in a Web Worker instead of decoding on the main thread, matching the Ceph object browser. Multiple downloads can run at once, each with its own progress and a cancel control, and a download keeps running when you navigate into another folder. Cancelling a transfer now stops it on the server too, rather than letting it finish in the background — which previously could exhaust memory and crash the tab when several large downloads were cancelled.
