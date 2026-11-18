import type { ReactNode } from "react"
import { useLingui } from "@lingui/react/macro"
import { TabBar, TabBarItem } from "@cloudoperators/juno-ui-components"

export type TabType = "rules" | "rbac"

interface SecurityGroupTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  showRBACTab?: boolean
}

const isTabType = (key: ReactNode): key is TabType => key === "rules" || key === "rbac"

export function SecurityGroupTabs({ activeTab, onTabChange, showRBACTab = true }: SecurityGroupTabsProps) {
  const { t } = useLingui()

  // TabBar keeps its own active item once a tab is clicked, so activeItem keeps it in sync with activeTab.
  // `active` only covers the first render, before activeItem is applied.
  return (
    <TabBar
      className="mt-4"
      ariaLabel={t`Security group sections`}
      activeItem={activeTab}
      onActiveItemChange={(key) => isTabType(key) && onTabChange(key)}
    >
      <TabBarItem value="rules" label={t`Rules`} active={activeTab === "rules"} />
      {showRBACTab && <TabBarItem value="rbac" label={t`RBAC Policies`} active={activeTab === "rbac"} />}
    </TabBar>
  )
}
