import { useState } from "react"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Icon,
  Button,
  Stack,
  TextInput,
  Select,
  SelectOption,
  Badge,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroupRule } from "@/server/Network/types/securityGroup"
import type { FilterSettings } from "@/client/components/ListToolbar/types"
import { DeleteRuleDialog } from "./-modals/DeleteRuleDialog"

interface SecurityGroupRulesTableProps {
  rules: SecurityGroupRule[]
  onDeleteRule: (ruleId: string) => void
  isDeletingRule: boolean
  deleteError: string | null
  onAddRule?: () => void
  // Client-side filtering controls
  searchTerm?: string
  onSearchChange?: (searchTerm: string | number | string[] | undefined) => void
  filterSettings?: FilterSettings
  onFilterChange?: (filterSettings: FilterSettings) => void
}

type SortField = "direction" | "protocol" | "description"
type SortDirection = "asc" | "desc"

export function SecurityGroupRulesTable({
  rules,
  onDeleteRule,
  isDeletingRule,
  deleteError,
  onAddRule,
  searchTerm = "",
  onSearchChange,
  filterSettings,
  onFilterChange,
}: SecurityGroupRulesTableProps) {
  const { t } = useLingui()
  const [ruleToDelete, setRuleToDelete] = useState<SecurityGroupRule | null>(null)
  const [sortField, setSortField] = useState<SortField>("direction")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Extract direction filter value from selectedFilters
  const selectedDirectionFilter = filterSettings?.selectedFilters?.find((f) => f.name === "direction")
  const directionFilterValue = selectedDirectionFilter?.value || "all"

  // Sort rules locally (BFF handles filtering)
  const sortedRules = [...rules].sort((a, b) => {
    let aValue: string | undefined
    let bValue: string | undefined

    switch (sortField) {
      case "direction":
        aValue = a.direction
        bValue = b.direction
        break
      case "protocol":
        aValue = a.protocol || ""
        bValue = b.protocol || ""
        break
      case "description":
        aValue = a.description || ""
        bValue = b.description || ""
        break
    }

    const comparison = (aValue || "").localeCompare(bValue || "")
    return sortDirection === "asc" ? comparison : -comparison
  })

  const handleDeleteClick = (rule: SecurityGroupRule) => {
    setRuleToDelete(rule)
  }

  const handleConfirmDelete = (ruleId: string) => {
    onDeleteRule(ruleId)
  }

  const handleCloseDeleteDialog = () => {
    if (!isDeletingRule) {
      setRuleToDelete(null)
    }
  }

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  const handleDirectionFilterChange = (value: string) => {
    if (onFilterChange && filterSettings) {
      const newSelectedFilters =
        value === "all"
          ? filterSettings.selectedFilters?.filter((f) => f.name !== "direction") || []
          : [
              ...(filterSettings.selectedFilters?.filter((f) => f.name !== "direction") || []),
              { name: "direction", value },
            ]

      const newFilterSettings = {
        ...filterSettings,
        selectedFilters: newSelectedFilters,
      }
      onFilterChange(newFilterSettings)
    }
  }

  const clearFilters = () => {
    handleDirectionFilterChange("all")
    onSearchChange?.("")
  }

  const hasActiveFilters = directionFilterValue !== "all" || searchTerm !== ""

  // Format port range display
  const formatPortRange = (rule: SecurityGroupRule): string => {
    if (rule.protocol === "icmp" || rule.protocol === "ipv6-icmp") {
      if (rule.port_range_min !== null && rule.port_range_max !== null) {
        return t`Type: ${rule.port_range_min}, Code: ${rule.port_range_max}`
      }
      return t`Any`
    }

    if (rule.port_range_min === null || rule.port_range_max === null) {
      return t`Any`
    }

    if (rule.port_range_min === rule.port_range_max) {
      return String(rule.port_range_min)
    }

    return `${rule.port_range_min}-${rule.port_range_max}`
  }

  // Format remote source display
  const formatRemoteSource = (rule: SecurityGroupRule): string => {
    if (rule.remote_ip_prefix) {
      return rule.remote_ip_prefix
    }
    if (rule.remote_group_id) {
      return t`SG: ${rule.remote_group_id.substring(0, 8)}...`
    }
    return t`Any`
  }

  return (
    <>
      <Stack direction="vertical" gap="4">
        {/* Filters and Controls */}
        <Stack direction="horizontal" gap="4" alignment="center" className="mb-4">
          <div className="flex-1">
            <Stack direction="horizontal" gap="2" wrap>
              <Select
                value={directionFilterValue}
                onChange={(value) => handleDirectionFilterChange(String(value || "all"))}
                label={t`Direction`}
                width="auto"
              >
                <SelectOption value="all" label={t`All`} />
                <SelectOption value="ingress" label={t`Ingress`} />
                <SelectOption value="egress" label={t`Egress`} />
              </Select>

              <Select
                value={sortField}
                onChange={(value) => setSortField(String(value || "direction") as SortField)}
                label={t`Sort by`}
                width="auto"
              >
                <SelectOption value="direction" label={t`Direction`} />
                <SelectOption value="protocol" label={t`Protocol`} />
                <SelectOption value="description" label={t`Description`} />
              </Select>

              <Button variant="subdued" onClick={toggleSortDirection} title={t`Toggle sort direction`}>
                <Icon icon={sortDirection === "asc" ? "expandMore" : "expandLess"} />
              </Button>
            </Stack>
          </div>

          <TextInput
            placeholder={t`Search...`}
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-64"
          />

          {onAddRule && (
            <Button variant="primary" icon="addCircle" onClick={onAddRule}>
              <Trans>Add rule</Trans>
            </Button>
          )}
        </Stack>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <Stack direction="horizontal" gap="2" alignment="center">
            {directionFilterValue !== "all" && (
              <Badge
                text={`${t`Direction`}: ${directionFilterValue}`}
                icon="close"
                onClick={() => handleDirectionFilterChange("all")}
                className="cursor-pointer"
              />
            )}
            {searchTerm && (
              <Badge
                text={`${t`Search`}: ${searchTerm}`}
                icon="close"
                onClick={() => onSearchChange?.("")}
                className="cursor-pointer"
              />
            )}
            <Button variant="subdued" size="small" onClick={clearFilters}>
              <Trans>Clear filters</Trans>
            </Button>
          </Stack>
        )}

        {/* Rules Table */}
        {sortedRules.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-theme-secondary mb-4">
              {hasActiveFilters ? <Trans>No rules match your filters</Trans> : <Trans>No rules defined yet</Trans>}
            </p>
            {!hasActiveFilters && onAddRule && (
              <Button variant="primary" onClick={onAddRule}>
                <Trans>Add your first rule</Trans>
              </Button>
            )}
            {hasActiveFilters && (
              <Button variant="subdued" onClick={clearFilters}>
                <Trans>Clear filters</Trans>
              </Button>
            )}
          </div>
        ) : (
          <DataGrid columns={7} className="security-group-rules-table">
            <DataGridRow>
              <DataGridHeadCell>{t`Direction`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Ethertype`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Protocol`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Range`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Remote Source`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Actions`}</DataGridHeadCell>
            </DataGridRow>
            {sortedRules.map((rule) => (
              <DataGridRow key={rule.id} data-testid={`rule-row-${rule.id}`}>
                <DataGridCell>
                  <Badge
                    text={rule.direction}
                    variant={rule.direction === "ingress" ? "info" : "success"}
                    className="capitalize"
                  />
                </DataGridCell>
                <DataGridCell>{rule.description || t`—`}</DataGridCell>
                <DataGridCell>{rule.ethertype}</DataGridCell>
                <DataGridCell>{rule.protocol || t`Any`}</DataGridCell>
                <DataGridCell>{formatPortRange(rule)}</DataGridCell>
                <DataGridCell className="font-mono text-sm">{formatRemoteSource(rule)}</DataGridCell>
                <DataGridCell>
                  <Button
                    icon="deleteForever"
                    variant="subdued"
                    size="small"
                    onClick={() => handleDeleteClick(rule)}
                    title={t`Delete rule`}
                  />
                </DataGridCell>
              </DataGridRow>
            ))}
          </DataGrid>
        )}
      </Stack>

      {/* Delete Confirmation Dialog */}
      <DeleteRuleDialog
        rule={ruleToDelete}
        open={!!ruleToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        isLoading={isDeletingRule}
        error={deleteError}
      />
    </>
  )
}
