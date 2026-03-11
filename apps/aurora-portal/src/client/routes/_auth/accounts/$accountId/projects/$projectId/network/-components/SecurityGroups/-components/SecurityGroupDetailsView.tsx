import { Container, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useState, useMemo } from "react"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
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
  onEdit?: () => void
  onDeleteRule: (ruleId: string) => void
  isDeletingRule?: boolean
  deleteRuleError?: string | null
  filterControls: RulesFilterControls
}

export function SecurityGroupDetailsView({
  securityGroup,
  onEdit,
  onDeleteRule,
  isDeletingRule = false,
  deleteRuleError = null,
  filterControls,
}: SecurityGroupDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("rules")

  const allRules = securityGroup.security_group_rules || []

  // Client-side filtering and sorting
  const filteredAndSortedRules = useMemo(() => {
    let result = allRules

    // Extract direction from filterSettings locally
    const directionFilter = filterControls.filterSettings.selectedFilters?.find((f) => f.name === "direction")?.value

    // Filter by direction
    if (directionFilter && directionFilter !== "all") {
      result = result.filter((rule) => rule.direction === directionFilter)
    }

    // Filter by search term
    if (filterControls.searchTerm) {
      const searchLower = filterControls.searchTerm.toLowerCase()
      result = result.filter(
        (rule) =>
          rule.description?.toLowerCase().includes(searchLower) ||
          rule.protocol?.toLowerCase().includes(searchLower) ||
          rule.remote_ip_prefix?.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    if (filterControls.sortSettings.sortBy) {
      const sortKey = filterControls.sortSettings.sortBy as "direction" | "protocol" | "description"
      result = [...result].sort((a, b) => {
        const aValue = (a[sortKey] || "") as string
        const bValue = (b[sortKey] || "") as string
        const comparison = aValue.localeCompare(bValue)
        return filterControls.sortSettings.sortDirection === "asc" ? comparison : -comparison
      })
    }

    return result
  }, [allRules, filterControls])

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
