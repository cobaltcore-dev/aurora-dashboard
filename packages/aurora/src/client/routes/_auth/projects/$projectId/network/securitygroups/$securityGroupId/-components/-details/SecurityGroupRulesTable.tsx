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
  Status,
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

// Neutron accepts a protocol as a name, as the legacy icmpv6 alias, or as an IANA number,
// so every spelling of ICMP has to be recognised before reading the port range fields.
const ICMP_PROTOCOLS = new Set(["icmp", "1", "ipv6-icmp", "icmpv6", "58"])

function isIcmpProtocol(protocol: string | null | undefined): boolean {
  return protocol != null && ICMP_PROTOCOLS.has(protocol.toLowerCase())
}

interface SecurityGroupRulesTableProps {
  rules: SecurityGroupRule[] // Filtered rules
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

  // Format port range display.
  // The two port range fields carry ICMP type/code instead of ports when the rule is an ICMP one,
  // so the protocol decides how they are read. Both fields are nullable and optional, hence the
  // loose == null checks: a missing key must read as "unset", not fall through to String(undefined).
  const formatPortRange = (rule: SecurityGroupRule): string => {
    const portRangeMin = rule.port_range_min
    const portRangeMax = rule.port_range_max

    if (isIcmpProtocol(rule.protocol)) {
      const typeValue = portRangeMin
      const codeValue = portRangeMax

      if (typeValue == null) {
        return t`—`
      }
      // Neutron accepts a type without a code, meaning "any code of that type"
      if (codeValue == null) {
        return t`Type: ${typeValue}`
      }
      return t`Type: ${typeValue}, Code: ${codeValue}`
    }

    if (portRangeMin == null || portRangeMax == null) {
      return t`—`
    }

    if (portRangeMin === portRangeMax) {
      return String(portRangeMin)
    }

    return `${portRangeMin}-${portRangeMax}`
  }

  const columnCount = canDeleteRule ? 6 : 5

  return (
    <>
      {/* Zone 1 — sort + add rule button, no background */}
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        {sortSettings && onSortChange && (
          <SortInput
            options={sortSettings.options}
            sortBy={sortSettings.sortBy}
            sortDirection={sortSettings.sortDirection ?? "asc"}
            selectClassName="min-w-40"
            onSortByChange={(v) =>
              onSortChange({ ...sortSettings, sortBy: v, sortDirection: sortSettings.sortDirection })
            }
            onSortDirectionChange={(dir) => onSortChange({ ...sortSettings, sortDirection: dir })}
          />
        )}
        {canCreateRule && onCreateRule && (
          <Button variant="primary" onClick={toggleAddRuleModal} className="whitespace-nowrap">
            <Trans>Add Rule</Trans>
          </Button>
        )}
      </Stack>

      {/* Zone 2 — filter + search + active filter pills */}
      {(filterSettings || onSearchChange) && (
        <DataGridToolbar>
          <Stack direction="vertical" gap="2">
            <Stack distribution="between" alignment="center">
              {filterSettings && onFilterChange && (
                <FiltersInput
                  filters={filterSettings.filters}
                  selectClassName="sm:min-w-40"
                  comboboxClassName="sm:min-w-40"
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
                  className="w-60 sm:w-68"
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
      <DataGrid columns={columnCount} className="security-group-rules-table">
        <DataGridRow>
          <DataGridHeadCell>{t`Direction`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Ethertype`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Protocol`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Range`}</DataGridHeadCell>
          {canDeleteRule && <DataGridHeadCell />}
        </DataGridRow>
        {rules.length === 0 ? (
          <DataGridRow>
            <DataGridCell colSpan={columnCount}>
              <Status status="empty" title={t`There are no rules for this security group`} />
            </DataGridCell>
          </DataGridRow>
        ) : (
          rules.map((rule) => (
            <DataGridRow key={rule.id} data-testid={`rule-row-${rule.id}`}>
              <DataGridCell>{rule.direction || t`—`}</DataGridCell>
              <DataGridCell>{rule.description || t`—`}</DataGridCell>
              <DataGridCell>{rule.ethertype}</DataGridCell>
              <DataGridCell>{rule.protocol || t`—`}</DataGridCell>
              <DataGridCell>{formatPortRange(rule)}</DataGridCell>
              {canDeleteRule && (
                <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end pr-0">
                  <PopupMenu>
                    <PopupMenuOptions>
                      <PopupMenuItem label={t`Delete Rule`} onClick={() => handleDeleteClick(rule)} />
                    </PopupMenuOptions>
                  </PopupMenu>
                </DataGridCell>
              )}
            </DataGridRow>
          ))
        )}
      </DataGrid>

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
