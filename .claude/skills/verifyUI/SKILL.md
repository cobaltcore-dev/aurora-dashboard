---
name: verifyUI
description: Check that Juno UI components are used correctly in a service or diff by comparing against Juno sources and stories in node_modules, and against the rules in references/. Use for UI verification or when called by verify.
argument-hint: <service path | files | "diff">
---

# verifyUI

Input: a service path, a list of files, or "diff" (meaning `git diff --name-only main`). If none is given, use "diff".

1. **Collect usage**: Grep the scoped `*.tsx` files for `from "@cloudoperators/juno-` imports. Build a unique list of the imported components. Only these get checked.

2. **Look up Juno**: The package lives at `node_modules/@cloudoperators/juno-ui-components` (installs often hoist it under `node_modules/.pnpm/@cloudoperators+juno-ui-components*/node_modules/...` — find it with `find node_modules -path '*@cloudoperators/juno-ui-components/package.json'`). For each component in the list, Glob under its folder for:
   - `**/<Name>.stories.*`: valid variants, props and composition examples
   - `**/<Name>.component.*` or `**/<Name>.d.ts`: prop types, required props, deprecations

   **This build ships only `*.stories.d.ts` (type declarations), not `*.stories.tsx` source — so there are no story bodies, but the exported story NAMES are still the catalog of endorsed variants and you MUST read them.** `export declare const NoHead`, `HoverableRow`, `HoverableRowWithInteractableElements`, `ColSpanCell` etc. each name a composition Juno blesses — a header-less grid, a clickable row, interactive elements inside a row, a colspan cell. Cross-reference every story name against the call site: if a story name describes the exact thing the code hand-rolls (e.g. code renders a head row + empty panel while a `NoHead` variant exists, or colors a span while `HoverableRow` is the clickable-row pattern), that mismatch is a finding. Read both `<Name>.stories.d.ts` AND `<Name>.component.d.ts` — the component types give props, the story names give the approved compositions. Never stop at the component types alone. Say in the report that stories were types-only.

3. **Check usage** for each call site:
   - props exist and values are valid (e.g. `variant`, `size`)
   - required props are set
   - no deprecated components or props
   - composition matches the stories (e.g. children, parent/child pairs)
   - no raw HTML or custom component where a Juno component exists
   - **right component for the data**: a two-column `DataGrid` of label/value pairs should be a `DescriptionList`. Link-colored text (`text-theme-link`) inside a `DataGridRow` that already has `onClick` is wrong — the row is natively clickable, so the color should be removed, not turned into a link. Wrong-Juno-component / redundant-affordance is a finding, not just raw-HTML.
   - **empty/loading/error structure**: for every `DataGrid`/table, find its `length === 0`, `isLoading`, `isError` branches and confirm the state component (`Status`, `Message`) is returned _instead of_ the grid, not nested as a row below the `DataGridHeadCell` header.
   - no style overrides that break the design system (inline `style`, hard-coded colors)

4. **Check rules**: Read `references/*.md` in this skill folder and check every rule against the scoped files.

5. **Report**:

   ```
   ## verifyUI: <scope>
   Checked: Button, Modal, DataGrid (stories ✅ / types only ⚠️)
   ❌ file:line – <Component> problem → fix (story/rule reference)
   ⚠️ file:line – risk → suggestion
   ```

   List at most ~10 findings, worst first. If nothing is found, write `✅ No findings`.
