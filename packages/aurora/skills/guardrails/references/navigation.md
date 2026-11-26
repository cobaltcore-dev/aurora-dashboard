# Navigation guardrails

Rules for navigation. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **NAV-1** `[scope: aurora]` Use Side Navigation as top-level nav (fixed left; max 3 levels; exactly one active item; parent of active child stays expanded; use icons on top level only; labels short Title Case).
- **NAV-2** `[scope: design-system]` For switching between peer content within a view, use the Juno `TabBar` / `TabBarItem` component — never a custom pill or stacked-button pattern.
- **NAV-3** `[scope: aurora]` The Side Navigation keeps a stable width: it must not resize when a filter is applied, and must not shift or break on detail pages. Don't override its width — it's the `SideNavigation` component's own (16rem / 256px).
