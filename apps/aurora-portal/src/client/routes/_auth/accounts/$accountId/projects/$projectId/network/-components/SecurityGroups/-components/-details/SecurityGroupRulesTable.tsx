import { useState, useEffect } from "react"
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
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroupRule, CreateSecurityGroupRuleInput } from "@/server/Network/types/securityGroup"
import type { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import type { ListSortConfig } from "@/client/utils/useListWithFiltering"
import { DeleteRuleDialog } from "../-modals/DeleteRuleDialog"
import { AddRuleModal } from "../-modals/AddRuleModal/AddRuleModal"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"

interface SecurityGroupRulesTableProps {
  rules: SecurityGroupRule[]
  onDeleteRule: (ruleId: string) => void
  isDeletingRule: boolean
  deleteError: string | null
  // Client-side filtering and sorting controls
  searchTerm?: string
  onSearchChange?: (searchTerm: string | number | string[] | undefined) => void
  sortSettings?: ListSortConfig<"direction" | "protocol" | "description">
  onSortChange?: (sortSettings: SortSettings) => void
  filterSettings?: FilterSettings
  onFilterChange?: (filterSettings: FilterSettings) => void
  // Add rule functionality
  securityGroupId?: string
  onCreateRule?: (ruleData: CreateSecurityGroupRuleInput) => Promise<void>
  isCreatingRule?: boolean
  createRuleError?: string | null
  availableSecurityGroups?: Array<{ id: string; name: string | null }>
}

export function SecurityGroupRulesTable({
  rules,
  onDeleteRule,
  isDeletingRule,
  deleteError,
  searchTerm = "",
  onSearchChange,
  sortSettings,
  onSortChange,
  filterSettings,
  onFilterChange,
  securityGroupId,
  onCreateRule,
  isCreatingRule = false,
  createRuleError = null,
  availableSecurityGroups = [],
}: SecurityGroupRulesTableProps) {
  const { t } = useLingui()
  const [ruleToDelete, setRuleToDelete] = useState<SecurityGroupRule | null>(null)
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false)

  // Extract sort values from sortSettings
  const sortField = (sortSettings?.sortBy as string) || "direction"
  const sortDirection = sortSettings?.sortDirection || "asc"

  // Check if any filters are active
  const hasActiveFilterSelections = (filterSettings?.selectedFilters?.length ?? 0) > 0

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

  const handleAddRuleClick = () => {
    setIsAddRuleModalOpen(true)
  }

  const handleCloseAddRuleModal = () => {
    setIsAddRuleModalOpen(false)
  }

  // Close dialog after successful deletion
  useEffect(() => {
    if (!isDeletingRule && !deleteError) {
      setRuleToDelete(null)
    }
  }, [isDeletingRule, deleteError])

  const handleSortFieldChange = (value: string) => {
    if (onSortChange && sortSettings) {
      onSortChange({
        ...sortSettings,
        sortBy: value,
      })
    }
  }

  const toggleSortDirection = () => {
    if (onSortChange && sortSettings) {
      onSortChange({
        ...sortSettings,
        sortDirection: sortDirection === "asc" ? "desc" : "asc",
      })
    }
  }

  const handleFilterSelect = (selectedFilter: { name: string; value: string }) => {
    if (onFilterChange && filterSettings) {
      const filterExists = filterSettings.selectedFilters?.some(
        (filter) => filter.name === selectedFilter.name && filter.value === selectedFilter.value
      )
      if (filterExists) return

      const supportsMultiValue = filterSettings.filters.find(
        (filter) => selectedFilter.name === filter.filterName
      )?.supportsMultiValue

      const newSelected = supportsMultiValue
        ? [...(filterSettings.selectedFilters || []), selectedFilter]
        : [
            ...(filterSettings.selectedFilters || []).filter((filter) => filter.name !== selectedFilter.name),
            selectedFilter,
          ]

      onFilterChange({ ...filterSettings, selectedFilters: newSelected })
    }
  }

  const handleFilterDelete = (filterToRemove: { name: string; value: string }) => {
    if (onFilterChange && filterSettings) {
      onFilterChange({
        ...filterSettings,
        selectedFilters: filterSettings.selectedFilters?.filter(
          (filter) => !(filter.name === filterToRemove.name && filter.value === filterToRemove.value)
        ),
      })
    }
  }

  const clearFilters = () => {
    if (onFilterChange && filterSettings) {
      onFilterChange({
        ...filterSettings,
        selectedFilters: [],
      })
    }
    onSearchChange?.("")
  }

  const hasActiveFilters = hasActiveFilterSelections || searchTerm !== ""

  // Format port range display
  const formatPortRange = (rule: SecurityGroupRule): string => {
    if (rule.protocol === "icmp" || rule.protocol === "ipv6-icmp") {
      if (rule.port_range_min !== null && rule.port_range_max !== null) {
        const typeValue = rule.port_range_min
        const codeValue = rule.port_range_max
        return t`Type: ${typeValue}, Code: ${codeValue}`
      }
      return t`-`
    }

    if (rule.port_range_min === null || rule.port_range_max === null) {
      return t`-`
    }

    if (rule.port_range_min === rule.port_range_max) {
      return String(rule.port_range_min)
    }

    return `${rule.port_range_min}-${rule.port_range_max}`
  }

  return (
    <>
      <Stack direction="vertical" gap="4">
        {/* Filters and Controls */}
        <Stack direction="horizontal" gap="4" alignment="center" className="mb-4">
          <div className="flex-1">
            <Stack direction="horizontal" gap="2" wrap>
              {filterSettings && <FiltersInput filters={filterSettings.filters} onChange={handleFilterSelect} />}

              <Select
                value={sortField}
                onChange={(value) => handleSortFieldChange(String(value || "direction"))}
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

          {onCreateRule && (
            <Button variant="primary" icon="addCircle" onClick={handleAddRuleClick}>
              <Trans>Add rule</Trans>
            </Button>
          )}
        </Stack>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <Stack direction="horizontal" gap="2" alignment="center">
            {filterSettings?.selectedFilters?.map((filter) => {
              const filterDef = filterSettings.filters.find((f) => f.filterName === filter.name)
              const displayName = filterDef?.displayName || filter.name
              return (
                <Badge
                  key={`${filter.name}-${filter.value}`}
                  text={`${displayName}: ${filter.value}`}
                  icon="close"
                  onClick={() => handleFilterDelete(filter)}
                  className="cursor-pointer"
                />
              )
            })}
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
        {rules.length === 0 ? (
          <Stack
            direction="vertical"
            alignment="center"
            distribution="center"
            gap="6"
            className="border-theme-background-lvl-3 bg-theme-background-lvl-1 rounded-lg border-2 border-dashed py-16"
          >
            <Icon icon="description" size="80" className="text-theme-disabled" />
            <Stack direction="vertical" alignment="center" gap="2">
              <h3 className="text-theme-high text-lg font-semibold">
                {hasActiveFilters ? <Trans>No rules match your filters</Trans> : <Trans>No rules defined yet</Trans>}
              </h3>
              <p className="text-theme-light text-center text-sm">
                {hasActiveFilters ? (
                  <Trans>Try adjusting your filters to see more results</Trans>
                ) : (
                  <Trans>Add security group rules to control incoming and outgoing traffic</Trans>
                )}
              </p>
            </Stack>
            {!hasActiveFilters && onCreateRule && (
              <Button variant="primary" icon="addCircle" onClick={handleAddRuleClick}>
                <Trans>Add your first rule</Trans>
              </Button>
            )}
            {hasActiveFilters && (
              <Button variant="primary" onClick={clearFilters}>
                <Trans>Clear filters</Trans>
              </Button>
            )}
          </Stack>
        ) : (
          <DataGrid columns={6} className="security-group-rules-table">
            <DataGridRow>
              <DataGridHeadCell>{t`Direction`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Ethertype`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Protocol`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Range`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Actions`}</DataGridHeadCell>
            </DataGridRow>
            {rules.map((rule) => (
              <DataGridRow key={rule.id} data-testid={`rule-row-${rule.id}`}>
                <DataGridCell>{rule.direction || t`—`}</DataGridCell>
                <DataGridCell>{rule.description || t`—`}</DataGridCell>
                <DataGridCell>{rule.ethertype}</DataGridCell>
                <DataGridCell>{rule.protocol || t`-`}</DataGridCell>
                <DataGridCell>{formatPortRange(rule)}</DataGridCell>
                <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end justify-end pr-0">
                  <PopupMenu>
                    <PopupMenuOptions>
                      <PopupMenuItem label={t`Delete`} onClick={() => handleDeleteClick(rule)} />
                    </PopupMenuOptions>
                  </PopupMenu>
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

      {/* Add Rule Modal */}
      {securityGroupId && onCreateRule && (
        <AddRuleModal
          securityGroupId={securityGroupId}
          open={isAddRuleModalOpen}
          onClose={handleCloseAddRuleModal}
          onCreate={onCreateRule}
          isLoading={isCreatingRule}
          error={createRuleError}
          availableSecurityGroups={availableSecurityGroups}
        />
      )}
    </>
  )
}
