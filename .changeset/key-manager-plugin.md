---
"@cobaltcore-dev/aurora": minor
---

Add the OpenStack Key Manager (Barbican) plugin: list, view, create and delete for Secrets, Containers and Orders, with server-side policy enforcement on every operation. The create modals mirror Barbican's type-driven forms — the secret payload content type is derived from the secret type (with base64 encoding handling), order algorithm/bit-length/mode options depend on the chosen algorithm, and container secret fields are filtered by secret type per container type (generic/rsa/certificate). Create and delete now surface success toasts, surface Barbican's own error description on failure, distinguish "no matches" from "no data" empty states, keep list search from refetching on every keystroke, and disable the modal close button while a mutation is in flight.
