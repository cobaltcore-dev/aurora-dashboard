import { Container, Stack } from "@cloudoperators/juno-ui-components"
import { useState } from "react"
import type {
  SecurityGroup,
  SecurityGroupRule,
  CreateSecurityGroupRuleInput,
} from "@/server/Network/types/securityGroup"
import type { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import type { ListSortConfig } from "@/client/utils/useListWithFiltering"
import { SecurityGroupHeader, SecurityGroupBasicInfo, SecurityGroupTabs, type TabType } from "./-details"
import { SecurityGroupRulesTable } from "./-details"
import { SecurityGroupRBACPolicies } from "./-details/SecurityGroupRBACPolicies"

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
  // Add rule functionality - passed through to SecurityGroupRulesTable
  onCreateRule?: (ruleData: CreateSecurityGroupRuleInput) => Promise<void>
  isCreatingRule?: boolean
  createRuleError?: string | null
  availableSecurityGroups?: Array<{ id: string; name: string | null }>
  currentProjectId: string
}

export function SecurityGroupDetailsView({
  securityGroup,
  filteredAndSortedRules,
  onEdit,
  onDeleteRule,
  isDeletingRule = false,
  deleteRuleError = null,
  filterControls,
  onCreateRule,
  isCreatingRule = false,
  createRuleError = null,
  availableSecurityGroups = [],
  currentProjectId,
}: SecurityGroupDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("rules")

  // Determine if this is a shared security group (not owned by current project)
  const isOwner = securityGroup.project_id === currentProjectId
  const isShared = !isOwner
  const showRBACTab = isOwner

  return (
    <Container px={false} py>
      <Stack direction="vertical" gap="4">
        {/* Header Section */}
        <SecurityGroupHeader name={securityGroup.name} id={securityGroup.id} />

        {/* Basic Info Section */}
        <SecurityGroupBasicInfo securityGroup={securityGroup} onEdit={onEdit} />

        {/* Tabs Navigation - Hide for shared security groups */}
        {!isShared && <SecurityGroupTabs activeTab={activeTab} onTabChange={setActiveTab} showRBACTab={showRBACTab} />}

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "rules" && (
            <SecurityGroupRulesTable
              rules={filteredAndSortedRules}
              totalRulesCount={securityGroup.security_group_rules?.length}
              onDeleteRule={onDeleteRule}
              isDeletingRule={isDeletingRule}
              deleteError={deleteRuleError}
              searchTerm={filterControls.searchTerm}
              onSearchChange={filterControls.onSearchChange}
              sortSettings={filterControls.sortSettings}
              onSortChange={filterControls.onSortChange}
              filterSettings={filterControls.filterSettings}
              onFilterChange={filterControls.onFilterChange}
              securityGroupId={securityGroup.id}
              onCreateRule={isShared ? undefined : onCreateRule}
              isCreatingRule={isCreatingRule}
              createRuleError={createRuleError}
              availableSecurityGroups={availableSecurityGroups}
              readOnly={isShared}
            />
          )}
          {activeTab === "rbac" && <SecurityGroupRBACPolicies securityGroupId={securityGroup.id} />}
        </div>
      </Stack>
    </Container>
  )
}
