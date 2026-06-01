import { Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

export type TabType = "rules" | "rbac"

interface SecurityGroupTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  showRBACTab?: boolean
}

export function SecurityGroupTabs({ activeTab, onTabChange, showRBACTab = true }: SecurityGroupTabsProps) {
  const getTabClassName = (tab: TabType) => {
    const baseClasses = "px-6 py-3 font-semibold border-b-2 transition-colors"
    const activeClasses = "border-theme-accent text-theme-highest"
    const inactiveClasses = "border-transparent text-theme-secondary hover:text-theme-high"

    return `${baseClasses} ${activeTab === tab ? activeClasses : inactiveClasses}`
  }

  return (
    <div className="border-theme-background-lvl-3 mt-1 border-b">
      <Stack direction="horizontal" gap="0">
        <button className={getTabClassName("rules")} onClick={() => onTabChange("rules")}>
          <Trans>Rules</Trans>
        </button>
        {showRBACTab && (
          <button className={getTabClassName("rbac")} onClick={() => onTabChange("rbac")}>
            <Trans>RBAC Policies</Trans>
          </button>
        )}
      </Stack>
    </div>
  )
}
