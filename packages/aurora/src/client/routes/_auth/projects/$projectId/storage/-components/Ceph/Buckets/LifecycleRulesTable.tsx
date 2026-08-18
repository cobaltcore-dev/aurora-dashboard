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
  Icon,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"
import { DeleteLifecycleRuleModal } from "./DeleteLifecycleRuleModal"
import { getLifecycleRuleDeletedToast, getLifecycleRuleDeleteErrorToast } from "./BucketToastNotifications"
import {
  formatFilter,
  formatExpiration,
  formatTransitions,
  formatNoncurrentExpiration,
  formatNoncurrentTransitions,
  isWholeBucketExpirationRule,
} from "./utils/lifecycleUtils"

interface LifecycleRuleWithIndex {
  rule: LifecycleRuleRead
  originalIndex: number
}

interface LifecycleRulesTableProps {
  bucketName: string
  rulesWithIndices: LifecycleRuleWithIndex[]
  selectedIndices: number[]
  onToggleSelectRule: (index: number) => void
  onEditRule: (index: number) => void
  onDeleteRule?: (index: number) => void
  isMutating?: boolean
  isFiltered?: boolean
}

/**
 * Data grid for displaying and managing lifecycle rules
 *
 * Displays up to 100 rules (S3 limit) in a simple table.
 * Supports search/filter by Rule ID.
 */
export function LifecycleRulesTable({
  bucketName,
  rulesWithIndices,
  selectedIndices,
  onToggleSelectRule,
  onEditRule,
  onDeleteRule,
  isMutating = false,
  isFiltered = false,
}: LifecycleRulesTableProps) {
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
    const { message, ...options } = getLifecycleRuleDeletedToast(bucketName, deleteModalState.ruleId)
    toast.success(message, options)
    // Call parent callback if provided (for draft state updates in parent)
    onDeleteRule?.(index)
  }

  const handleDeleteError = (_index: number, errorMessage: string) => {
    const { message, ...options } = getLifecycleRuleDeleteErrorToast(bucketName, errorMessage, deleteModalState.ruleId)
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
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Scope`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Expiration`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Noncurrent Versions`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Other Actions`}</DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>
        {isEmpty ? (
          <DataGridRow>
            <DataGridCell colSpan={8}>
              <p className="text-theme-light py-8 text-center">
                {isFiltered ? (
                  <Trans>No lifecycle rules matching the current search criteria.</Trans>
                ) : (
                  <Trans>There are no lifecycle rules for this bucket</Trans>
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
            const isWholeBucketRule = isWholeBucketExpirationRule(rule)

            // Format noncurrent versions column (merge expiration + transitions)
            const noncurrentExpirationText = formatNoncurrentExpiration(
              rule.NoncurrentVersionExpiration as unknown as {
                NoncurrentDays: number
                NewerNoncurrentVersions?: number
              }
            )
            const noncurrentTransitionsText = formatNoncurrentTransitions(
              rule.NoncurrentVersionTransitions as unknown as {
                NoncurrentDays: number
                StorageClass: string
                NewerNoncurrentVersions?: number
              }[]
            )
            const noncurrentText =
              noncurrentExpirationText === "–" && noncurrentTransitionsText === "–"
                ? "–"
                : [noncurrentExpirationText, noncurrentTransitionsText].filter((t) => t !== "–").join("; ")

            // Format other actions column (transitions + abort)
            const transitionsText = formatTransitions(
              rule.Transitions as unknown as { StorageClass: string; Days?: number; Date?: string }[]
            )
            const abortDays = rule.AbortIncompleteMultipartUpload?.DaysAfterInitiation
            const abortText = abortDays !== undefined ? t`After ${abortDays} days` : "–"
            const otherActionsText =
              transitionsText === "–" && abortText === "–"
                ? "–"
                : [transitionsText, abortText].filter((t) => t !== "–").join("; ")

            const ruleLabel = rule.ID || String(originalIndex + 1)

            return (
              <DataGridRow key={key} data-testid={`lifecycle-rule-row-${originalIndex}`}>
                <DataGridCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIndices.includes(originalIndex)}
                    onChange={() => onToggleSelectRule(originalIndex)}
                    aria-label={t`Select rule ${ruleLabel}`}
                    data-testid={`select-rule-${originalIndex}`}
                  />
                </DataGridCell>
                <DataGridCell>{rule.ID || t`—`}</DataGridCell>
                <DataGridCell>
                  <Stack gap="1" alignment="center">
                    {rule.Status}
                    {isWholeBucketRule && (
                      <Icon
                        icon="warning"
                        size="16"
                        color="jn-global-text-warning"
                        title={t`Warning: This rule will expire all objects in the bucket`}
                      />
                    )}
                  </Stack>
                </DataGridCell>
                <DataGridCell className="break-all">{formatFilter(rule.Filter, rule.Prefix)}</DataGridCell>
                <DataGridCell>
                  {formatExpiration(
                    rule.Expiration as unknown as { Days?: number; Date?: string; ExpiredObjectDeleteMarker?: boolean }
                  )}
                </DataGridCell>
                <DataGridCell>{noncurrentText}</DataGridCell>
                <DataGridCell>{otherActionsText}</DataGridCell>
                <DataGridCell onClick={(e) => e.stopPropagation()} className="justify-end pr-0">
                  <div className="flex h-full items-center justify-end">
                    <PopupMenu>
                      <PopupMenuOptions>
                        <PopupMenuItem
                          label={t`Edit Lifecycle Rule`}
                          onClick={() => onEditRule(originalIndex)}
                          disabled={effectiveIsMutating}
                        />
                        <PopupMenuItem
                          label={t`Delete Lifecycle Rule`}
                          onClick={() => handleOpenDeleteModal(originalIndex, rule.ID)}
                          disabled={effectiveIsMutating}
                        />
                      </PopupMenuOptions>
                    </PopupMenu>
                  </div>
                </DataGridCell>
              </DataGridRow>
            )
          })
        )}
      </DataGrid>

      {/* Delete Lifecycle Rule Modal */}
      <DeleteLifecycleRuleModal
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
