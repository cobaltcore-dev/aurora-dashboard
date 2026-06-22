import { useState, useEffect, useRef } from "react"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  DataGridToolbar,
  Button,
  Stack,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  SearchInput,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroupRule, CreateSecurityGroupRuleInput } from "@/server/Network/types/securityGroup"
import type { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import type { ListSortConfig } from "@/client/utils/useListWithFiltering"
import { DeleteRuleDialog } from "../../-modals/DeleteRuleDialog"
import { AddRuleModal } from "../../-modals/AddRuleModal/AddRuleModal"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { useModal } from "@/client/utils/useModal"

interface SecurityGroupRulesTableProps {
  rules: SecurityGroupRule[] // Filtered rules
  totalRulesCount?: number // Total rules count before filtering
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
  onCreateRule?: (ruleData: Omit<CreateSecurityGroupRuleInput, "project_id">) => Promise<void>
  isCreatingRule?: boolean
  createRuleError?: string | null
  availableSecurityGroups?: Array<{ id: string; name: string | null }>
  canCreateRule: boolean
  canDeleteRule: boolean
}

export function SecurityGroupRulesTable({
  rules,
  totalRulesCount,
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
  canCreateRule,
  canDeleteRule,
}: SecurityGroupRulesTableProps) {
  const { t } = useLingui()
  const [ruleToDelete, setRuleToDelete] = useState<SecurityGroupRule | null>(null)
  const [isAddRuleModalOpen, toggleAddRuleModal] = useModal()
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debounceTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

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

  // Close dialog after successful deletion
  useEffect(() => {
    if (!isDeletingRule && !deleteError) {
      setRuleToDelete(null)
    }
  }, [isDeletingRule, deleteError])

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
        {/* Zone 1 — sort + add rule button + count, no background */}
        <Stack distribution="between" alignment="center" gap="2" className="pb-2">
          {/* Count display */}
          <span className="theme-color-text-light text-sm">
            {totalRulesCount !== undefined && rules.length !== totalRulesCount ? (
              <Trans>
                Showing {rules.length} of {totalRulesCount} rules
              </Trans>
            ) : (
              <Trans>{rules.length} rules</Trans>
            )}
          </span>

          <Stack gap="2">
            {sortSettings && onSortChange && (
              <SortInput
                options={sortSettings.options}
                sortBy={sortSettings.sortBy}
                sortDirection={sortSettings.sortDirection ?? "asc"}
                onSortByChange={(v) =>
                  onSortChange({ ...sortSettings, sortBy: v, sortDirection: sortSettings.sortDirection })
                }
                onSortDirectionChange={(dir) => onSortChange({ ...sortSettings, sortDirection: dir })}
              />
            )}
            {canCreateRule && onCreateRule && (
              <Button variant="primary" icon="addCircle" onClick={toggleAddRuleModal} className="whitespace-nowrap">
                <Trans>Add rule</Trans>
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Zone 2 — filter + search + active filter pills */}
        {(filterSettings || onSearchChange) && (
          <DataGridToolbar>
            <Stack direction="vertical" gap="2">
              <Stack distribution="between" alignment="center">
                {filterSettings && onFilterChange && (
                  <FiltersInput
                    filters={filterSettings.filters}
                    onChange={(selected) => {
                      const alreadySelected = (filterSettings.selectedFilters || []).some(
                        (f) => f.name === selected.name && f.value === selected.value
                      )
                      if (alreadySelected) return

                      const supportsMulti = filterSettings.filters.find(
                        (f) => f.filterName === selected.name
                      )?.supportsMultiValue
                      const newSelected = supportsMulti
                        ? [...(filterSettings.selectedFilters || []), selected]
                        : [...(filterSettings.selectedFilters || []).filter((f) => f.name !== selected.name), selected]
                      onFilterChange({ ...filterSettings, selectedFilters: newSelected })
                    }}
                  />
                )}
                {onSearchChange && (
                  <SearchInput
                    placeholder={t`Search rules...`}
                    data-testid="searchbar"
                    value={localSearchTerm}
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const v = e.currentTarget.value
                      setLocalSearchTerm(v)
                      clearTimeout(debounceTimer.current)
                      debounceTimer.current = window.setTimeout(() => onSearchChange(v), 500)
                    }}
                    onSearch={(v) => {
                      clearTimeout(debounceTimer.current)
                      onSearchChange(typeof v === "string" ? v : "")
                    }}
                    onClear={() => {
                      clearTimeout(debounceTimer.current)
                      setLocalSearchTerm("")
                      onSearchChange("")
                    }}
                  />
                )}
              </Stack>
              {filterSettings?.selectedFilters && filterSettings.selectedFilters.length > 0 && (
                <SelectedFilters
                  selectedFilters={filterSettings.selectedFilters}
                  onDelete={(filterToRemove) =>
                    onFilterChange?.({
                      ...filterSettings,
                      selectedFilters: (filterSettings.selectedFilters || []).filter(
                        (f) => !(f.name === filterToRemove.name && f.value === filterToRemove.value)
                      ),
                    })
                  }
                  onClear={() => onFilterChange?.({ ...filterSettings, selectedFilters: [] })}
                />
              )}
            </Stack>
          </DataGridToolbar>
        )}

        {/* Rules Table */}
        {rules.length === 0 ? (
          <Trans>There are no rules for this security group</Trans>
        ) : (
          <DataGrid columns={canDeleteRule ? 6 : 5} className="security-group-rules-table">
            <DataGridRow>
              <DataGridHeadCell>{t`Direction`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Ethertype`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Protocol`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Range`}</DataGridHeadCell>
              {canDeleteRule && <DataGridHeadCell>{t`Actions`}</DataGridHeadCell>}
            </DataGridRow>
            {rules.map((rule) => (
              <DataGridRow key={rule.id} data-testid={`rule-row-${rule.id}`}>
                <DataGridCell>{rule.direction || t`—`}</DataGridCell>
                <DataGridCell>{rule.description || t`—`}</DataGridCell>
                <DataGridCell>{rule.ethertype}</DataGridCell>
                <DataGridCell>{rule.protocol || t`-`}</DataGridCell>
                <DataGridCell>{formatPortRange(rule)}</DataGridCell>
                {canDeleteRule && (
                  <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end justify-end pr-0">
                    <PopupMenu>
                      <PopupMenuOptions>
                        <PopupMenuItem label={t`Delete`} onClick={() => handleDeleteClick(rule)} />
                      </PopupMenuOptions>
                    </PopupMenu>
                  </DataGridCell>
                )}
              </DataGridRow>
            ))}
          </DataGrid>
        )}
      </Stack>

      {/* Delete Confirmation Dialog */}
      {canDeleteRule && (
        <DeleteRuleDialog
          rule={ruleToDelete}
          open={!!ruleToDelete}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
          isLoading={isDeletingRule}
          error={deleteError}
        />
      )}

      {/* Add Rule Modal */}
      {canCreateRule && securityGroupId && onCreateRule && isAddRuleModalOpen && (
        <AddRuleModal
          securityGroupId={securityGroupId}
          open={isAddRuleModalOpen}
          onClose={toggleAddRuleModal}
          onCreate={onCreateRule}
          isLoading={isCreatingRule}
          error={createRuleError}
          availableSecurityGroups={availableSecurityGroups}
        />
      )}
    </>
  )
}
