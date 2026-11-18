import { EMPTY_VALUE } from "./TwoColumnDescriptionList"

interface StatusLabelProps {
  /** Raw status/state string from the API (any casing, e.g. "active", "RUNNING"). */
  value: string | null | undefined
}

/**
 * Renders a status/state value with uniform casing ("Active", "Running").
 * Keep the raw value intact; Tailwind lowercases it and uppercases only the
 * first letter. Inline-block is required for the first-letter pseudo-element.
 */
export function StatusLabel({ value }: StatusLabelProps) {
  if (!value) return <>{EMPTY_VALUE}</>
  return <span className="inline-block lowercase first-letter:uppercase">{value}</span>
}
