import { EMPTY_VALUE } from "./TwoColumnDescriptionList"

interface StatusLabelProps {
  /** Raw status/state string from the API (any casing, e.g. "active", "RUNNING"). */
  value: string | null | undefined
}

/**
 * Renders a status/state value with uniform casing ("Active", "Running").
 *
 * Backends disagree on casing — Glance image status is lowercase ("active"),
 * Nova power-state labels are uppercase ("RUNNING"). We lowercase the raw value
 * and let CSS `capitalize` uppercase the first letter, so a plain `capitalize`
 * class alone (which cannot lowercase existing caps) is not enough.
 */
export function StatusLabel({ value }: StatusLabelProps) {
  if (!value) return <>{EMPTY_VALUE}</>
  return <span className="capitalize">{value.toLowerCase()}</span>
}
