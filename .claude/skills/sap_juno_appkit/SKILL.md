---
name: sap_juno_appkit
description: "UI build spec and lean reference map for assembling apps with Juno design-system components (packages/ui-components). Activate when building a Juno app, page, screen or layout, choosing which Juno component fits a UI need, wiring the AppShell scaffold, applying Juno tokens/spacing/colors/theming, or following Juno UX rules (navigation, error/empty/loading states, modals vs panels vs wizards, forms, DataGrid, messages vs toasts, UX writing/title case, accessibility). Carries the non-negotiables and decision tables; points to the repo source and docs/ux for exact detail. Embeddable into a larger SAP app-building skill. NOT for developing the Juno components themselves (use sap_ui_components for that)."
---

# Juno AppKit — lean UI build map for consuming Juno

Reference map for building **apps with** Juno. Carries only the synthesis — non-negotiables, decision tables, verified tokens, recipes. **The repo is the source of truth**; this skill tells you where to look. For developing Juno components themselves, use `sap_ui_components`.

## MUST consult the source — do not answer detail from memory

This skill is a map, not the full reference. For any **specific prop, variant, type, token value, or full UX rule** beyond the synthesis here, you MUST open the cited source — or dispatch the `sap_juno_lookup` agent — before answering. Never invent a prop name, variant, token, or rule from memory.

| Need | Read |
|------|------|
| A component's exact props / variants / types | `packages/ui-components/src/components/{Name}/{Name}.component.tsx` (+ `.stories.tsx` for usage) |
| An exact token value | `packages/ui-components/src/global.css`, `src/theme.css` (common ones cached in [references/foundations.md](references/foundations.md)) |
| The full UX rule / rationale for a pattern | `docs/ux/<topic>.md` — e.g. `modals.md`, `forms.md`, `datagrid.md`, `error-handling-loading-empty-states.md`, `navigation-side-navigation.md`, `ux-writing-content-design.md`, `accessibility.md`, `semantic-variants.md` |
| Anything not synthesized here, or a cross-cutting question | dispatch the **`sap_juno_lookup`** agent (read-only; reads the source + docs/ux and returns the answer) |

Storybook (hosted): https://cloudoperators.github.io/juno/ . Full human-readable archive: Obsidian `SAP/Design System/00 Kontext/Juno *`.

## Hard rules (always)

1. **Prefix every utility with `jn:`** — Tailwind v4 with a `jn` prefix. Unprefixed classes do nothing.
2. **Semantic `theme-*` classes, never primitives.** `jn:bg-theme-background-lvl-1`, `jn:text-theme-default` adapt to light/dark. Raw Tailwind colors (`jn:bg-red-500`) don't exist — defaults are reset.
3. **Light/dark is class-based**, set once via `AppShellProvider theme="theme-dark|theme-light"` (or `StyleProvider`). `ThemeToggle` flips it. Theming is light/dark only today — full custom theming is planned, not shipped.
4. **Spacing/type = Tailwind default** (base 0.25rem, rem). Fractional multiples (`jn:py-1.75`, `jn:gap-1.5`) are idiomatic. px only for `rounded-3px`, border widths, breakpoints.
5. **`AppShell` is the default scaffold.** Don't hand-build the frame; pass its slots. Wrap page body in `Container py` (the content area has no padding of its own).
6. **Compose containers, don't sprinkle margins.** `Stack` (`gap`), `Grid`, `Container`, `Divider` for rhythm. Reach for Juno components and props before raw utilities.

## UX non-negotiables (the things to never get wrong)

- **Title Case** for every title/heading/button/message — NOT sentence case (`Delete Image`, `There was an Error`). No trailing periods, no exclamation marks, no ALL CAPS, no "Please"/"Thanks"/"We". Buttons = infinitive verb (+ short object noun). "Sign in", not "Log in". One term per action, app-wide. (`docs/ux/ux-writing-content-design.md`)
- **Semantic variants by meaning, never aesthetics**: `info` neutral · `success` done · `warning` might go wrong · `error` already went wrong · `danger` about to do something destructive. (`docs/ux/semantic-variants.md`)
- **Never colour alone** to signal meaning (required fields, status, validation) — pair with text/icon.
- **Every page = Page Header + Content Area + Page Footer.** Header mandatory on every page (incl. errors). Side Navigation is the default top-level nav (max 3 levels); horizontal top-level nav is legacy.
- **`Status` is the default** for any empty / no-matches / error / loading state. Distinguish "no data" vs "no matches" vs "error".
- **Modals**: one primary action (rightmost, `primary`), never stacked, never for sign-in, never multi-step (→ Wizard). Destructive = `primary-danger` with severity gating (button / checkbox / type-to-confirm).
- **A11y**: real `<label>` (not placeholder), `aria-label` on icon buttons, never hide focus rings, `aria-live`/`role=alert|status` for dynamic content. (`docs/ux/accessibility.md`)

## Quick decision index

| I want to... | Use |
|--------------|-----|
| App frame / page scaffold | `AppShell` (+ `AppShellProvider`) |
| Page title | `ContentHeading` inside `Container py` |
| Primary page action(s) | `ContentAreaToolbar` + one `primary` `Button` |
| Text / number input · pick one · searchable pick | `TextInput` · `Select`/`NativeSelect` · `ComboBox` |
| On/off instantly · boolean in a form | `Switch` · `Checkbox` |
| Date / time / range | `DateTimePicker` |
| Group form fields | `Form` → `FormSection` → `FormRow` |
| Tabular records · attributes of one record | `DataGrid` · `DescriptionList` |
| Contextual edit/create (stay in list) | `Panel` drawer · else dedicated detail page (default, deep-linkable) |
| Confirm / destructive | `Modal` (one task) · multi-step → Wizard · optional in-context action → Inline Action Box (`Box`) |
| Empty / loading / error / no-matches | `Status` (distinguish the three) |
| Persistent region banner · transient feedback | `Message` · `Toast` (+ `NotificationManager`) |
| Status label · removable filter | `Badge` · `Pill` |
| Action menu per item | `PopupMenu` / overflow (⋮) — destructive last, after a divider |
| Switch whole content area · tabbed section · routed tabs | `MainTabs` · `Tabs` · `TabNavigation` |
| Vertical / horizontal nav | `SideNavigation` · `TopNavigation` |

Button hierarchy: `primary` **max once per page**, `default` normal, `subdued` when crowded, `primary-danger` destructive (sparingly). Fuller when-to-use + rationale: [references/decisions.md](references/decisions.md).

## References (synthesis only)

| File | Use when |
|------|----------|
| [references/decisions.md](references/decisions.md) | fuller when-to-use tables — component picker by category, layout composition, navigation, UX pattern decisions (states, modal tiers, messages vs toasts, forms, DataGrid). Each row points to its `docs/ux/` source |
| [references/foundations.md](references/foundations.md) | verified token quick-reference (colors light/dark, elevation, spacing/grid, type, radius/border) — cached from `global.css`/`theme.css` |
| [references/recipes.md](references/recipes.md) | copy-paste JSX skeletons: app page, nav, form, data list, panel drawer, modal, empty state, embedded/MFE |
