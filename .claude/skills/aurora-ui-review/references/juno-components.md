# Verifying juno-ui-components usage

The repo pins a specific version (`packages/aurora/package.json`). Always verify against the **installed** package:

```bash
bash .claude/skills/aurora-ui-review/scripts/locate_juno.sh
# path:       .../node_modules/.pnpm/@cloudoperators+juno-ui-com_<hash>/node_modules/@cloudoperators/juno-ui-components
# version:    9.4.0
# components: .../build/components
```

Each component's API and JSDoc is in `build/components/<Name>/<Name>.component.d.ts`. Storybook (`https://cloudoperators.github.io/juno/?path=/docs/components-<name>--docs`) shows examples, but it documents the latest version, which may differ.

## What to check

Strict TypeScript already rejects invalid prop types and values. Focus on what the compiler can't catch:

- **Deprecated or fallback props.** Search the `.d.ts` for `@deprecated` and for JSDoc phrases like "fallback", "backward compatibility" or "legacy".
  - Example: `Pagination.pages` is a fallback for `totalPages`.
  - Example: `SortButton.onOrderChange` is `@deprecated` in favour of `onChange`.
- **Props spread to the DOM instead of the documented callback.** Example: `Pagination` documents `onKeyPress`, but code passes `onKeyDown`, which only works because the rest props are spread. Report it as Low: it relies on undocumented behaviour.
- **Semantic choice of variants.** `Status` `"empty"` vs `"no-matches"` (no data vs. no filter or search results); `Message` / `Button` / `confirmButtonVariant` `error` vs `danger` (Juno `semantic-variants.md`).
- **Controlled vs uncontrolled.** Components that keep internal state (e.g. `TabNavigation`, `Tabs`, `Select`, `Pagination` input) need the controlled props kept in sync (`activeItem`, `value`, `currentPage`). Otherwise the UI and the URL diverge.
- **Accessibility props.** `Modal` needs `title` / `heading` or `ariaLabel`. Icon-only `Button`s need `aria-label` / `title`. `TabNavigation` takes `ariaLabel`.
- **Busy states.** Use `Button progress` / `progressLabel`, `Modal disableConfirmButton` / `disableCancelButton` / `disableCloseButton`, and `Pagination progress` while requests are running.
- **Layout props the guidelines rely on.** `DataGrid` `columns`, `minContentColumns` (action column), `cellVerticalAlignment` (multi-item cells).

## Recording component findings

Cite the `.d.ts` path and line together with the package version, e.g. `juno-ui-components@9.4.0 build/components/Pagination/Pagination.component.d.ts:20`. Then cite the code location.
