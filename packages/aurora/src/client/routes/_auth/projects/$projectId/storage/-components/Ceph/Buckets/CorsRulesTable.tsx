import { useState } from "react"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Stack,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Checkbox,
  toast,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"
import { DeleteCorsRuleModal } from "./DeleteCorsRuleModal"
import { getCorsRuleDeletedToast, getCorsRuleDeleteErrorToast } from "./BucketToastNotifications"

interface CorsRuleWithIndex {
  rule: CorsRuleRead
  originalIndex: number
}

interface CorsRulesTableProps {
  bucketName: string
  rulesWithIndices: CorsRuleWithIndex[]
  selectedIndices: number[]
  onToggleSelectRule: (index: number) => void
  onEditRule: (index: number) => void
  onDeleteRule?: (index: number) => void
  isMutating?: boolean
  isFiltered?: boolean
  canUpdateCors: boolean
  canDeleteCors: boolean
}

/**
 * Data grid for displaying and managing CORS rules
 *
 * Displays up to 100 rules (S3 limit) in a simple table.
 * Supports search/filter by Rule ID.
 */
export function CorsRulesTable({
  bucketName,
  rulesWithIndices,
  selectedIndices,
  onToggleSelectRule,
  onEditRule,
  onDeleteRule,
  isMutating = false,
  isFiltered = false,
  canUpdateCors,
  canDeleteCors,
}: CorsRulesTableProps) {
  const { t } = useLingui()

  const [isRowDeleteMutating, setIsRowDeleteMutating] = useState(false)

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    ruleIndex: number
    ruleId?: string
  }>({
    isOpen: false,
    ruleIndex: -1,
    ruleId: undefined,
  })

  const handleOpenDeleteModal = (index: number, ruleId?: string) => {
    setDeleteModalState({
      isOpen: true,
      ruleIndex: index,
      ruleId,
    })
  }

  const handleCloseDeleteModal = () => {
    setDeleteModalState({
      isOpen: false,
      ruleIndex: -1,
      ruleId: undefined,
    })
  }

  const handleDeleteSuccess = (index: number) => {
    const { message, ...options } = getCorsRuleDeletedToast(bucketName, deleteModalState.ruleId)
    toast.success(message, options)
    // Call parent callback if provided (for draft state updates in parent)
    onDeleteRule?.(index)
  }

  const handleDeleteError = (_index: number, errorMessage: string) => {
    const { message, ...options } = getCorsRuleDeleteErrorToast(bucketName, errorMessage, deleteModalState.ruleId)
    toast.error(message, options)
  }

  const effectiveIsMutating = isMutating || isRowDeleteMutating

  const isEmpty = rulesWithIndices.length === 0

  return (
    <Stack direction="vertical" gap="4">
      {/* Rules Table */}
      <DataGrid columns={8}>
        <DataGridRow>
          <DataGridHeadCell>
            <span className="sr-only">
              <Trans>Select</Trans>
            </span>
          </DataGridHeadCell>
          <DataGridHeadCell>{t`Rule ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Allowed Origins`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Allowed Methods`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Allowed Headers`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Expose Headers`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Max Age`}</DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>
        {isEmpty ? (
          <DataGridRow>
            <DataGridCell colSpan={8}>
              <p className="text-theme-light py-8 text-center">
                {isFiltered ? (
                  <Trans>No CORS rules matching the current search criteria.</Trans>
                ) : (
                  <Trans>There are no CORS rules for this bucket</Trans>
                )}
              </p>
            </DataGridCell>
          </DataGridRow>
        ) : (
          rulesWithIndices.map(({ rule, originalIndex }) => {
            // Rules are keyed by array index - they have no stable server-side id.
            // ID field is optional and may be absent or duplicated.
            // originalIndex is the contract with parent's onEditRule(index) / onDeleteRule(index).
            const key = originalIndex
            const ruleLabel = rule.ID || String(originalIndex + 1)
            const hasAnyRowAction = canUpdateCors || canDeleteCors

            return (
              <DataGridRow key={key} data-testid={`cors-rule-row-${originalIndex}`}>
                <DataGridCell onClick={(e) => e.stopPropagation()}>
                  {canDeleteCors && (
                    <Checkbox
                      checked={selectedIndices.includes(originalIndex)}
                      onChange={() => onToggleSelectRule(originalIndex)}
                      aria-label={t`Select rule ${ruleLabel}`}
                      data-testid={`select-rule-${originalIndex}`}
                    />
                  )}
                </DataGridCell>
                <DataGridCell>{rule.ID || t`—`}</DataGridCell>
                <DataGridCell className="break-all">{rule.AllowedOrigins.join(", ")}</DataGridCell>
                <DataGridCell>{rule.AllowedMethods.join(", ")}</DataGridCell>
                <DataGridCell>
                  {rule.AllowedHeaders && rule.AllowedHeaders.length > 0 ? rule.AllowedHeaders.join(", ") : t`—`}
                </DataGridCell>
                <DataGridCell>
                  {rule.ExposeHeaders && rule.ExposeHeaders.length > 0 ? rule.ExposeHeaders.join(", ") : t`—`}
                </DataGridCell>
                <DataGridCell>{rule.MaxAgeSeconds !== undefined ? rule.MaxAgeSeconds : t`—`}</DataGridCell>
                <DataGridCell onClick={(e) => e.stopPropagation()} className="justify-end pr-0">
                  {hasAnyRowAction && (
                    <div className="flex h-full items-center justify-end">
                      <PopupMenu>
                        <PopupMenuOptions>
                          {canUpdateCors && (
                            <PopupMenuItem
                              label={t`Edit`}
                              onClick={() => onEditRule(originalIndex)}
                              disabled={effectiveIsMutating}
                            />
                          )}
                          {canDeleteCors && (
                            <PopupMenuItem
                              label={t`Delete CORS Rule`}
                              onClick={() => handleOpenDeleteModal(originalIndex, rule.ID)}
                              disabled={effectiveIsMutating}
                            />
                          )}
                        </PopupMenuOptions>
                      </PopupMenu>
                    </div>
                  )}
                </DataGridCell>
              </DataGridRow>
            )
          })
        )}
      </DataGrid>

      {/* Delete CORS Rule Modal */}
      <DeleteCorsRuleModal
        isOpen={deleteModalState.isOpen}
        bucketName={bucketName}
        ruleIndex={deleteModalState.ruleIndex}
        ruleId={deleteModalState.ruleId}
        onClose={handleCloseDeleteModal}
        onSuccess={handleDeleteSuccess}
        onError={handleDeleteError}
        onMutatingChange={setIsRowDeleteMutating}
      />
    </Stack>
  )
}
