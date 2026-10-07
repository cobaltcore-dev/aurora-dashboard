import type { ReactNode } from "react"
import { useLingui } from "@lingui/react/macro"
import { TabNavigation, TabNavigationItem } from "@cloudoperators/juno-ui-components"

export type TabType = "rules" | "rbac"

interface SecurityGroupTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  showRBACTab?: boolean
}

const isTabType = (key: ReactNode): key is TabType => key === "rules" || key === "rbac"

export function SecurityGroupTabs({ activeTab, onTabChange, showRBACTab = true }: SecurityGroupTabsProps) {
  const { t } = useLingui()

  // TabNavigation keeps its own active item once a tab is clicked, so activeItem keeps it in sync with activeTab.
  // `active` only covers the first render, before activeItem is applied.
  return (
    <TabNavigation
      className="mt-4"
      activeItem={activeTab}
      onActiveItemChange={(key) => isTabType(key) && onTabChange(key)}
    >
      <TabNavigationItem value="rules" label={t`Rules`} active={activeTab === "rules"} />
      {showRBACTab && <TabNavigationItem value="rbac" label={t`RBAC Policies`} active={activeTab === "rbac"} />}
    </TabNavigation>
  )
}
