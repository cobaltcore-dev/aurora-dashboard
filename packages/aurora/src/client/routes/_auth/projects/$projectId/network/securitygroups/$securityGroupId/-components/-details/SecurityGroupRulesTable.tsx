import { useState, useEffect } from "react"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Button,
  Stack,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroupRule, CreateSecurityGroupRuleInput } from "@/server/Network/types/securityGroup"
import type { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import type { ListSortConfig } from "@/client/utils/useListWithFiltering"
import { DeleteRuleDialog } from "../../-modals/DeleteRuleDialog"
import { AddRuleModal } from "../../-modals/AddRuleModal/AddRuleModal"
import { ListToolbar } from "@/client/components/ListToolbar"
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
  readOnly?: boolean // Hide actions column and add rule button for shared security groups
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
  readOnly = false,
}: SecurityGroupRulesTableProps) {
  const { t } = useLingui()
  const [ruleToDelete, setRuleToDelete] = useState<SecurityGroupRule | null>(null)
  const [isAddRuleModalOpen, toggleAddRuleModal] = useModal()

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
        <ListToolbar
          totalCount={totalRulesCount ?? rules.length}
          filteredCount={rules.length}
          itemName={t`rules`}
          filterSettings={filterSettings}
          onFilter={onFilterChange}
          sortSettings={sortSettings}
          onSort={onSortChange}
          searchTerm={searchTerm}
          onSearch={onSearchChange}
          actions={
            !readOnly &&
            onCreateRule && (
              <Button variant="primary" icon="addCircle" onClick={toggleAddRuleModal}>
                <Trans>Add rule</Trans>
              </Button>
            )
          }
        />

        {/* Rules Table */}
        {rules.length === 0 ? (
          <Trans>There are no rules for this security group</Trans>
        ) : (
          <DataGrid columns={readOnly ? 5 : 6} className="security-group-rules-table">
            <DataGridRow>
              <DataGridHeadCell>{t`Direction`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Ethertype`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Protocol`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Range`}</DataGridHeadCell>
              {!readOnly && <DataGridHeadCell>{t`Actions`}</DataGridHeadCell>}
            </DataGridRow>
            {rules.map((rule) => (
              <DataGridRow key={rule.id} data-testid={`rule-row-${rule.id}`}>
                <DataGridCell>{rule.direction || t`—`}</DataGridCell>
                <DataGridCell>{rule.description || t`—`}</DataGridCell>
                <DataGridCell>{rule.ethertype}</DataGridCell>
                <DataGridCell>{rule.protocol || t`-`}</DataGridCell>
                <DataGridCell>{formatPortRange(rule)}</DataGridCell>
                {!readOnly && (
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
      {!readOnly && (
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
      {!readOnly && securityGroupId && onCreateRule && isAddRuleModalOpen && (
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
