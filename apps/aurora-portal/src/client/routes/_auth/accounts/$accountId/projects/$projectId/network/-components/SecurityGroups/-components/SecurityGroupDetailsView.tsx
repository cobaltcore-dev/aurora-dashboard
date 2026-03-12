import { Container, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useState } from "react"
import type { SecurityGroup, SecurityGroupRule } from "@/server/Network/types/securityGroup"
import type { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import type { ListSortConfig } from "@/client/utils/useListWithFiltering"
import { SecurityGroupHeader, SecurityGroupBasicInfo, SecurityGroupTabs, type TabType } from "./-details"
import { SecurityGroupRulesTable } from "./-details"

export interface RulesFilterControls {
  searchTerm: string
  onSearchChange: (term: string | number | string[] | undefined) => void
  sortSettings: ListSortConfig<"direction" | "protocol" | "description">
  onSortChange: (settings: SortSettings) => void
  filterSettings: FilterSettings
  onFilterChange: (settings: FilterSettings) => void
}

interface SecurityGroupDetailsViewProps {
  securityGroup: SecurityGroup
  filteredAndSortedRules: SecurityGroupRule[]
  onEdit?: () => void
  onDeleteRule: (ruleId: string) => void
  isDeletingRule?: boolean
  deleteRuleError?: string | null
  filterControls: RulesFilterControls
}

export function SecurityGroupDetailsView({
  securityGroup,
  filteredAndSortedRules,
  onEdit,
  onDeleteRule,
  isDeletingRule = false,
  deleteRuleError = null,
  filterControls,
}: SecurityGroupDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("rules")

  return (
    <Container px={false} py>
      <Stack direction="vertical" gap="4">
        {/* Header Section */}
        <SecurityGroupHeader name={securityGroup.name} id={securityGroup.id} />

        {/* Basic Info Section */}
        <SecurityGroupBasicInfo securityGroup={securityGroup} onEdit={onEdit} />

        {/* Tabs Navigation */}
        <SecurityGroupTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "rules" && (
            <SecurityGroupRulesTable
              rules={filteredAndSortedRules}
              onDeleteRule={onDeleteRule}
              isDeletingRule={isDeletingRule}
              deleteError={deleteRuleError}
              searchTerm={filterControls.searchTerm}
              onSearchChange={filterControls.onSearchChange}
              sortSettings={filterControls.sortSettings}
              onSortChange={filterControls.onSortChange}
              filterSettings={filterControls.filterSettings}
              onFilterChange={filterControls.onFilterChange}
            />
          )}
          {activeTab === "rbac" && (
            <p className="text-theme-secondary">
              <Trans>RBAC Policies functionality coming soon</Trans>
            </p>
          )}
        </div>
      </Stack>
    </Container>
  )
}
