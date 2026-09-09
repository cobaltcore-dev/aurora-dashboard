import type { ListSecurityGroupsInput } from "@/server/Network/types/securityGroup"
import type { Filter, SelectedFilter } from "@/client/components/ListToolbar/types"

/** Filter params this list may send to network.securityGroup.list. Names AND types come from the tRPC input schema. */
export type SecurityGroupFilterParams = Partial<Pick<ListSecurityGroupsInput, "shared" | "stateful">>
export type SecurityGroupFilterName = keyof SecurityGroupFilterParams

const BOOLEAN_VALUES = ["true", "false"] as const
type BooleanValue = (typeof BOOLEAN_VALUES)[number]

// Maps the raw string value carried in the URL/pill to the typed value sent to the tRPC procedure.
// If a server-side field ever changes type (e.g. to a string enum), this mapping fails to compile,
// surfacing the mismatch at build time instead of at runtime.
const BOOLEAN_PARAM: Record<BooleanValue, boolean> = {
  true: true,
  false: false,
}

const isBooleanValue = (value: string): value is BooleanValue => (BOOLEAN_VALUES as readonly string[]).includes(value)

const BOOLEAN_FILTER_NAMES = ["shared", "stateful"] as const satisfies readonly SecurityGroupFilterName[]
type BooleanFilterName = (typeof BOOLEAN_FILTER_NAMES)[number]

const isBooleanFilterName = (name: string): name is BooleanFilterName =>
  (BOOLEAN_FILTER_NAMES as readonly string[]).includes(name)

/**
 * Builds the Filter definitions for the Security Groups list toolbar.
 * Labels are passed in (rather than resolved via `t` here) so this module stays plain
 * data/logic and can be unit-tested without an I18nProvider.
 */
export const buildSecurityGroupFilters = (labels: {
  shared: string
  stateful: string
  yes: string
  no: string
}): Filter[] => [
  {
    displayName: labels.shared,
    filterName: "shared" satisfies SecurityGroupFilterName,
    values: [...BOOLEAN_VALUES],
    valueLabels: { true: labels.yes, false: labels.no },
    supportsMultiValue: false,
  },
  {
    displayName: labels.stateful,
    filterName: "stateful" satisfies SecurityGroupFilterName,
    values: [...BOOLEAN_VALUES],
    valueLabels: { true: labels.yes, false: labels.no },
    supportsMultiValue: false,
  },
]

/**
 * Builds the typed filter params sent to `network.securityGroup.list` from the currently
 * selected filters. Unlike the generic `Record<string, string>` builder, the return type here
 * is checked by the compiler against the tRPC input schema when spread into the query input.
 */
export const buildSecurityGroupFilterParams = (selectedFilters: SelectedFilter[]): SecurityGroupFilterParams => {
  const params: SecurityGroupFilterParams = {}

  for (const name of BOOLEAN_FILTER_NAMES) {
    // Single-value filters: the toolbar replaces an earlier selection, but the URL may still
    // carry more than one entry, in which case the last one wins.
    const selected = selectedFilters.filter((f) => !f.inactive && f.name === name).at(-1)

    if (selected && isBooleanValue(selected.value)) {
      params[name] = BOOLEAN_PARAM[selected.value]
    }
  }

  return params
}

/** Whether a raw URL value is a known, valid value for the given Security Groups filter name. */
export const isKnownSecurityGroupFilter = (name: string, value: string): boolean =>
  isBooleanFilterName(name) && isBooleanValue(value)
