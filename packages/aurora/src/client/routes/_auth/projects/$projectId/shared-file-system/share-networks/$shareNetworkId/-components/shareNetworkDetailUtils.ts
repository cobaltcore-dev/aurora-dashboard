export const SHARE_NETWORK_DETAILS_TABS = ["subnets", "security-services"] as const
export type ShareNetworkDetailsTab = (typeof SHARE_NETWORK_DETAILS_TABS)[number]
export const DEFAULT_SHARE_NETWORK_DETAILS_TAB: ShareNetworkDetailsTab = "subnets"

export function isShareNetworkDetailsTab(value: unknown): value is ShareNetworkDetailsTab {
  return typeof value === "string" && SHARE_NETWORK_DETAILS_TABS.includes(value as ShareNetworkDetailsTab)
}
