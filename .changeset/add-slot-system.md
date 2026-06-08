---
"@cobaltcore-dev/aurora": minor
---

Add extensible slot system for consumer widgets

Introduces `Slot`, `slots`, and `SlotProps` — a shadow DOM-based mechanism that lets consumers inject custom UI widgets into defined extension points in the Aurora layout.

- `slots` — object of named slot components passed via `AuroraAppProps`
- `SlotProps` — typed props supplied to each widget, including `auroraContext.client` for BFF access
- `Slot` — internal component that renders a widget inside an isolated shadow root
- `sideNavBanner` — first slot, rendered at the bottom of the project sidebar
