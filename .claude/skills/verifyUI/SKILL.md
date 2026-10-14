---
name: verifyUI
description: Check that Juno UI components are used correctly in a service or diff by comparing against Juno sources and stories in node_modules, and against the rules in references/. Use for UI verification or when called by verify.
argument-hint: <service path | files | "diff">
---

# verifyUI

Input: a service path, a list of files, or "diff" (meaning `git diff --name-only main`). If none is given, use "diff".

1. **Collect usage**: Grep the scoped `*.tsx` files for `from "@cloudoperators/juno-` imports. Build a unique list of the imported components. Only these get checked.

2. **Look up Juno**: The package lives at `node_modules/@cloudoperators/juno-ui-components`. If it isn't there, find it with `ls node_modules/@cloudoperators`. For each component in the list, Glob for:
   - `**/<Name>.stories.*`: valid variants, props and composition examples
   - `**/<Name>.component.*` or `**/<Name>.d.ts`: prop types, required props, deprecations

   Read only the props and story args, not the whole file. If no stories ship in the package, use the types as the source of truth and say so in the report.

3. **Check usage** for each call site:
   - props exist and values are valid (e.g. `variant`, `size`)
   - required props are set
   - no deprecated components or props
   - composition matches the stories (e.g. children, parent/child pairs)
   - no raw HTML or custom component where a Juno component exists
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
