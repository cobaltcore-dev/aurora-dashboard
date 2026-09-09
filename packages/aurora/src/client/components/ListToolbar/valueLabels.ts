import { Filter } from "./types"

/**
 * Resolves the human-readable label a filter defines for one of its raw values,
 * falling back to the raw value when no label is defined for it.
 *
 * Uses `Object.hasOwn` instead of a plain lookup because filter values can originate
 * from the URL: a plain `valueLabels[value]` would resolve `__proto__` (or `constructor`,
 * `toString`, …) to an inherited `Object.prototype` member, which is not nullish and so
 * would slip past a `??` fallback and reach the render as a non-string.
 */
export const resolveValueLabel = (filter: Filter | undefined, value: string): string =>
  filter?.valueLabels && Object.hasOwn(filter.valueLabels, value) ? filter.valueLabels[value] : value
