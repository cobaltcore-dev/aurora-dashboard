# Juno Design Foundations

Everything token-, color-, spacing- and type-related for building apps with Juno.

## Setup facts (do not fight these)

- **Tailwind CSS v4**, configured entirely in CSS. There is **no `tailwind.config.js`**. Config lives in `@theme` blocks in `packages/ui-components/src/global.css` and `src/theme.css`.
- Every utility is prefixed `jn:` → `jn:p-4`, `jn:bg-theme-accent`, `jn:text-sm`. The prefix comes from `@import "tailwindcss" prefix(jn)` in `global.css`.
- `@theme inline` resets Tailwind defaults: `--color-*: initial`, `--font-*: initial`, `--border-width-*: initial`. **Only Juno colors/fonts exist** — there is no `jn:bg-red-500`.
- Preflight (Tailwind's reset) ships with the import; there is no separate reset file.

## 3-Tier token system

| Tier | What | Where | Theme-dependent? |
|------|------|-------|------------------|
| 1 Primitives | raw palette ramps | `:root` in `global.css`/`theme.css` | no |
| 2 Semantic | meaning (`accent`, `danger`, `background-lvl-*`, `text-default`) | `.theme-light` / `.theme-dark` in `theme.css` | **yes** |
| 3 Component tokens | bound to utility classes (`--background-color-theme-button-primary`) | `@theme inline` in `global.css` | via tier 2 |

**Rule for app authors: use semantic/component classes, never primitives.** `jn:bg-theme-background-lvl-1` adapts to light/dark automatically; `jn:bg-sap-blue-3` does not.

## Colors (semantic, verified)

| Token | Light | Dark |
|-------|-------|------|
| `accent` / `info` | `rgb(0,118,203)` | `rgb(21,208,224)` |
| `success` | `rgb(79,184,28)` | `rgb(59,255,91)` |
| `warning` | `rgb(255,175,0)` | `rgb(255,198,0)` |
| `danger` / `error` | `rgb(199,0,0)` | `rgb(255,65,16)` |
| `focus` | = accent | = accent |

**Background elevation (0 = base surface → 5 = highest):**

| Level | Light | Dark |
|-------|-------|------|
| lvl-0 | white | juno-grey-blue-9 |
| lvl-1 | juno-grey-light-1 | juno-grey-blue-7 |
| lvl-2 | juno-grey-light-3 | juno-grey-blue-5 |
| lvl-3 | juno-grey-light-7 | juno-grey-blue-3 |
| lvl-4 | juno-grey-light-9 | juno-grey-blue-2 |
| lvl-5 | juno-grey-light-10 | juno-grey-blue-1 |

Use as `jn:bg-theme-background-lvl-{0..5}`. Also exposed: `jn:bg-theme-global-bg`, `jn:bg-theme-content-area-bg`.

**Text ramp** (`jn:text-theme-{...}`): `highest` (max contrast heading), `high`, `default` (body), `light` (muted), `disabled`, `link`. Light default `rgb(76,76,76)`, highest `rgb(0,0,0)`; Dark default `rgb(187,187,187)`, highest `rgb(255,254,253)`.

**Severity scale** (for status/monitoring UIs): `--color-theme-severity-{critical,very-high,high,medium,low,none,unknown}`.

**Primitive families** (tier 1, reference only — do not use directly): `sap-grey/blue/purple/green/orange 1..n`, `sap-gold`, `juno-grey-blue 1..11`, `juno-grey-light 1..10`, `juno-blue/turquoise/primary-blue`, `white`, `black`, `transparent`, `current`.

## Spacing & positioning

- **No custom spacing scale** → Tailwind v4 default applies: base unit **0.25rem**, value `n` = `n * 0.25rem`.
- **Fractional multiples are idiomatic**: `jn:py-1.75` (0.4375rem), `jn:px-2.25`, `jn:gap-1.5`. Seen directly in `Button` padding. Use them freely.
- Arbitrary values when needed: `jn:px-[0.5rem]`.
- Prefer `Stack` (`gap`) and `Container` (`px`/`py`) over hand-rolled margins for layout rhythm.

**Grid system tokens** (`:root`):
- `--grid-columns: 12`
- Generated column widths `--width-grid-col-1..12` (8.333% … 100%)
- `--grid-row-margin-x: -0.5rem`, `--grid-column-default-width: 8.333333%`
- Extra breakpoint above Tailwind defaults: `--breakpoint-3xl: 1856px` → `jn:3xl:...`

## Typography

Font families (`--font-*`, default-reset then redeclared):
- `jn:font-sans` → IBM Plex Sans (default UI font)
- `jn:font-condensed` → IBM Plex Sans Condensed
- `jn:font-serif` → IBM Plex Serif
- `jn:font-mono` → IBM Plex Mono (code)

Faces loaded via `src/fonts/plex/css/ibm-plex.css`. **No custom size/leading/tracking scale** → `jn:text-xs/sm/base/lg/...`, `jn:leading-*`, `jn:tracking-*` use Tailwind v4 rem defaults. Button sizing pairs size + leading, e.g. default `jn:text-base jn:leading-6`, small `jn:text-sm jn:leading-5`, xs `jn:text-xs jn:leading-4`.

Color text semantically (`jn:text-theme-default`), not by size.

## Radius, borders, shadows, z-index

- **Radius**: Tailwind defaults (`jn:rounded`, `jn:rounded-md`...) plus one custom token `jn:rounded-3px` (3px).
- **Border widths**: `--border-width: 1px` (default `jn:border`), plus `jn:border-2/3/4/6` = 2/3/4/6px, `jn:border-0`. Border color: `jn:border-theme-default`.
- **Shadows**: `jn:shadow-theme-default` and `jn:shadow-theme-default-hover`.
- **z-index**: no custom scale → Tailwind defaults (`jn:z-10`...).
- **px is reserved** for `rounded-3px`, border widths and breakpoints. Everything else is rem.

## Theming (light/dark)

- **Class-based, not media-query.** An ancestor carries `.theme-light` or `.theme-dark`; all tier-2 vars resolve from there.
- In an app, set the theme via `AppShellProvider theme="theme-dark"` or `StyleProvider theme="theme-dark"`. `ThemeToggle` flips it at runtime.
- Component CSS is injected under `layer(utilities)`; base/properties live in `@layer` blocks (Tailwind v4 cascade layers).

## Animations

Component-local `@keyframes` with a `juno-`-prefixed, scoped name in the component's own `.css`, imported into `global.css` under `layer(utilities)`. No global keyframes/animation token file. (Only relevant when building new components, not when consuming them.)

## Source of truth

Exact per-token values: `src/global.css` + `src/theme.css`. Color docs: `src/docs/colors.mdx`, `src/docs/ColorPalette/`. When in doubt, grep these rather than guessing a token name.
