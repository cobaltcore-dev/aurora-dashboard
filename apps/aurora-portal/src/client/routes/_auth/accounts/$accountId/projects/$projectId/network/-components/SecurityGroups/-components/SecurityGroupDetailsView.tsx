import { Container, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useState, useMemo } from "react"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import type { FilterSettings } from "@/client/components/ListToolbar/types"
import { SecurityGroupHeader, SecurityGroupBasicInfo, SecurityGroupTabs, type TabType } from "./-details"
import { SecurityGroupRulesTable } from "./SecurityGroupRulesTable"

interface SecurityGroupDetailsViewProps {
  securityGroup: SecurityGroup
  onEdit?: () => void
  onDeleteRule?: (ruleId: string) => void
  isDeletingRule?: boolean
  deleteRuleError?: string | null
  // Client-side filtering
  rulesSearchTerm?: string
  onRulesSearchChange?: (searchTerm: string | number | string[] | undefined) => void
  filterSettings?: FilterSettings
  onFilterChange?: (filterSettings: FilterSettings) => void
  rulesDirection?: "ingress" | "egress"
}

export function SecurityGroupDetailsView({
  securityGroup,
  onEdit,
  onDeleteRule,
  isDeletingRule = false,
  deleteRuleError = null,
  rulesSearchTerm = "",
  onRulesSearchChange,
  filterSettings,
  onFilterChange,
  rulesDirection,
}: SecurityGroupDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("rules")

  const allRules = securityGroup.security_group_rules || []

  // Client-side filtering
  const filteredRules = useMemo(() => {
    let filtered = allRules

    // Filter by direction
    if (rulesDirection) {
      filtered = filtered.filter((rule) => rule.direction === rulesDirection)
    }

    // Filter by search term
    if (rulesSearchTerm) {
      const searchLower = rulesSearchTerm.toLowerCase()
      filtered = filtered.filter((rule) => {
        return (
          rule.description?.toLowerCase().includes(searchLower) ||
          rule.protocol?.toLowerCase().includes(searchLower) ||
          rule.remote_ip_prefix?.toLowerCase().includes(searchLower)
        )
      })
    }

    return filtered
  }, [allRules, rulesDirection, rulesSearchTerm])

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
              rules={filteredRules}
              onDeleteRule={onDeleteRule || (() => {})}
              isDeletingRule={isDeletingRule}
              deleteError={deleteRuleError}
              searchTerm={rulesSearchTerm}
              onSearchChange={onRulesSearchChange}
              filterSettings={filterSettings}
              onFilterChange={onFilterChange}
            />
          )}
          {activeTab === "rbac" && (
            <div className="py-8 text-center">
              <p className="text-theme-secondary">
                <Trans>RBAC Policies functionality coming soon</Trans>
              </p>
            </div>
          )}
        </div>
      </Stack>
    </Container>
  )
}

