import { useState, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { plural } from "@lingui/core/macro"
import { i18n } from "@lingui/core"
import { useNavigate } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import {
  Spinner,
  Message,
  Button,
  Stack,
  toast,
  Checkbox,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
  DataGridToolbar,
  SearchInput,
  Divider,
} from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useCephPermissions } from "../hooks/useCephPermissions"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects"
import { LifecycleRulesTable } from "./LifecycleRulesTable"
import { LifecycleRuleModal } from "./LifecycleRuleModal"
import { DeleteLifecycleRulesModal } from "./DeleteLifecycleRulesModal"
import {
  getLifecycleSavedToast,
  getLifecycleSaveErrorToast,
  getLifecycleRulesDeletedToast,
  getLifecycleRulesDeleteErrorToast,
} from "./BucketToastNotifications"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"

interface LifecycleRulesTabProps {
  bucketName: string
}

/**
 * Lifecycle Rules tab container
 *
 * Manages lifecycle configuration for a Ceph bucket with full CRUD operations.
 * Each operation (add/edit/delete) immediately updates the server configuration.
 */
export function LifecycleRulesTab({ bucketName }: LifecycleRulesTabProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate({ from: Route.fullPath })
  const { permissions } = useCephPermissions(projectId)

  // Sort and search state are persisted in the URL
  const { lifecycleSortBy, lifecycleSortDirection, lifecycleSearch = "" } = Route.useSearch()

  // Server state
  const {
    data: lifecycleData,
    isLoading,
    error,
  } = trpcReact.storage.ceph.lifecycle.get.useQuery(
    {
      project_id: projectId,
      bucketName,
    },
    {
      enabled: !!projectId,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes, shared with useBucketInfo
    }
  )

  // Modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)

  // Mutation state for modals (to disable row actions during mutations)
  const [isRuleModalMutating, setIsRuleModalMutating] = useState(false)
  const [isBulkDeleteMutating, setIsBulkDeleteMutating] = useState(false)

  // Selection state for bulk actions
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  const sortSettings: SortSettings = {
    options: [
      { label: t`Rule ID`, value: "ID" },
      { label: t`Status`, value: "Status" },
      { label: t`Expiration`, value: "Expiration" },
    ],
    sortBy: lifecycleSortBy ?? "ID",
    sortDirection: lifecycleSortDirection ?? "asc",
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const value = typeof term === "string" ? term : ""
    startTransition(() => {
      navigate({
        search: (prev) => ({ ...prev, lifecycleSearch: value || undefined }),
      })
    })
  }

  const handleSortChange = (newSortSettings: SortSettings) => {
    const resolvedSortBy = (newSortSettings.sortBy?.toString() || "ID") as "ID" | "Status" | "Expiration"
    const resolvedDirection = (newSortSettings.sortDirection || "asc") as "asc" | "desc"
    startTransition(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          lifecycleSortBy: resolvedSortBy,
          lifecycleSortDirection: resolvedDirection,
        }),
      })
    })
  }

  const handleAddRule = () => {
    setEditingRuleIndex(null)
    setIsRuleModalOpen(true)
  }

  const handleEditRule = (index: number) => {
    setEditingRuleIndex(index)
    setIsRuleModalOpen(true)
  }

  const handleToggleSelectRule = (index: number) => {
    setSelectedIndices((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered rules
      setSelectedIndices((prev) => prev.filter((i) => !filteredIndices.includes(i)))
    } else {
      // Select all filtered rules
      setSelectedIndices((prev) => [...new Set([...prev, ...filteredIndices])])
    }
  }

  const handleBulkDelete = () => {
    setIsBulkDeleteModalOpen(true)
  }

  const handleDeleteRule = () => {
    // Clear selections after single-rule deletion to avoid stale indices
    setSelectedIndices([])
  }

  // Current rules from server
  const rules = lifecycleData?.rules ?? []

  // Rules that failed to map/validate on read (see lifecycleRouter's `get`). `set` is a full replace,
  // so mutating while some rules are unreadable would silently delete them on the next save  block
  // all mutating actions until they're fixed with an external tool.
  const skippedRuleCount = lifecycleData?.skippedRuleCount ?? 0
  const mutationsBlocked = skippedRuleCount > 0

  interface RuleWithOriginalIndex {
    rule: LifecycleRuleRead
    originalIndex: number
  }

  // Sort rules based on sort settings
  const sortRules = (items: RuleWithOriginalIndex[]): RuleWithOriginalIndex[] => {
    return [...items].sort((a, b) => {
      let comparison: number

      switch (lifecycleSortBy ?? "ID") {
        case "ID":
          comparison = (a.rule.ID || "").localeCompare(b.rule.ID || "")
          break
        case "Status":
          comparison = a.rule.Status.localeCompare(b.rule.Status)
          break
        case "Expiration":
          comparison = (a.rule.Expiration?.Days ?? -1) - (b.rule.Expiration?.Days ?? -1)
          break
        default:
          comparison = (a.rule.ID || "").localeCompare(b.rule.ID || "")
      }

      return (lifecycleSortDirection ?? "asc") === "desc" ? -comparison : comparison
    })
  }

  const rulesWithOriginalIndices = rules.map((rule, originalIndex) => ({
    rule,
    originalIndex,
  }))
  const filteredRulesWithIndices = sortRules(rulesWithOriginalIndices).filter(({ rule }) => {
    if (!lifecycleSearch) return true
    return (rule.ID || "").toLowerCase().includes(lifecycleSearch.toLowerCase())
  })

  // Get indices of filtered rules for select-all logic
  const filteredIndices = filteredRulesWithIndices.map(({ originalIndex }) => originalIndex)

  const allFilteredSelected = filteredIndices.length > 0 && filteredIndices.every((i) => selectedIndices.includes(i))
  const someFilteredSelected = filteredIndices.some((i) => selectedIndices.includes(i)) && !allFilteredSelected

  const skippedRulesMessage = i18n._(
    plural(skippedRuleCount, {
      one: "# lifecycle rule on this bucket could not be read and is hidden from this table. Saving any change here replaces the entire lifecycle configuration, which would permanently delete it. Fix it with an external S3 tool (e.g. the AWS CLI) first, then reload this page.",
      other:
        "# lifecycle rules on this bucket could not be read and are hidden from this table. Saving any change here replaces the entire lifecycle configuration, which would permanently delete them. Fix them with an external S3 tool (e.g. the AWS CLI) first, then reload this page.",
    })
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner variant="primary" size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Message variant="error" title={t`Failed to load lifecycle configuration`}>
        {error.message}
      </Message>
    )
  }

  return (
    <>
      {mutationsBlocked && (
        <Message variant="warning" title={t`Lifecycle rules cannot be modified`} className="mb-2">
          {skippedRulesMessage}
        </Message>
      )}

      {/* Zone 1 — Sort controls and Create rule button (outside DataGridToolbar) */}
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        <Stack gap="0.5" alignment="center">
          <SortInput
            options={sortSettings.options}
            sortBy={sortSettings.sortBy}
            sortDirection={sortSettings.sortDirection ?? "asc"}
            selectClassName="w-40"
            onSortByChange={(value) =>
              handleSortChange({ ...sortSettings, sortBy: value, sortDirection: sortSettings.sortDirection })
            }
            onSortDirectionChange={(direction) => handleSortChange({ ...sortSettings, sortDirection: direction })}
          />
        </Stack>
        {permissions.canUpdateLifecycle && (
          <Button variant="primary" onClick={handleAddRule} disabled={mutationsBlocked}>
            <Trans>Create Lifecycle Rule</Trans>
          </Button>
        )}
      </Stack>

      {/* Zone 2 — Bulk actions toolbar (inside DataGridToolbar) */}
      <DataGridToolbar>
        <Stack direction="vertical" gap="2">
          <Stack distribution="end" alignment="center">
            <SearchInput
              placeholder={t`Search lifecycle rules...`}
              data-testid="lifecycle-rules-searchbar"
              value={lifecycleSearch}
              onInput={(e) => {
                const v = e.currentTarget.value
                handleSearchChange(v)
              }}
              onSearch={(v) => handleSearchChange(typeof v === "string" ? v : "")}
              onClear={() => handleSearchChange("")}
            />
          </Stack>
          <Divider />
          <Stack distribution="between" gap="2" alignment="center" className="text-sm">
            {permissions.canDeleteLifecycle ? (
              <Stack gap="2" alignment="center">
                <Checkbox
                  checked={allFilteredSelected}
                  indeterminate={someFilteredSelected}
                  onChange={handleToggleSelectAll}
                  aria-label={t`Select all rules`}
                  data-testid="select-all-rules"
                  disabled={filteredRulesWithIndices.length === 0}
                />
                <PopupMenu className="flex items-center">
                  <PopupMenuToggle as="div">
                    <Button
                      disabled={selectedIndices.length === 0 || mutationsBlocked}
                      size="small"
                      icon="moreVert"
                      label={t`Actions`}
                    />
                  </PopupMenuToggle>
                  {selectedIndices.length > 0 && !mutationsBlocked && (
                    <PopupMenuOptions>
                      <PopupMenuItem
                        label={i18n._(
                          plural(selectedIndices.length, {
                            one: "Delete # Lifecycle Rule",
                            other: "Delete # Lifecycle Rules",
                          })
                        )}
                        onClick={handleBulkDelete}
                        data-testid="bulk-delete-lifecycle-rules-action"
                      />
                    </PopupMenuOptions>
                  )}
                </PopupMenu>
              </Stack>
            ) : (
              <span />
            )}
            <span className="theme-color-text-light">
              {filteredRulesWithIndices.length} {filteredRulesWithIndices.length === 1 ? t`rule` : t`rules`}
            </span>
          </Stack>
        </Stack>
      </DataGridToolbar>

      {/* Table */}
      <LifecycleRulesTable
        bucketName={bucketName}
        rulesWithIndices={filteredRulesWithIndices}
        selectedIndices={selectedIndices}
        onToggleSelectRule={handleToggleSelectRule}
        onEditRule={handleEditRule}
        onDeleteRule={handleDeleteRule}
        isMutating={isRuleModalMutating || isBulkDeleteMutating || mutationsBlocked}
        isFiltered={!!lifecycleSearch}
        canUpdateLifecycle={permissions.canUpdateLifecycle}
        canDeleteLifecycle={permissions.canDeleteLifecycle}
      />

      {/* Bulk delete rules modal */}
      <DeleteLifecycleRulesModal
        isOpen={isBulkDeleteModalOpen}
        bucketName={bucketName}
        ruleIndices={selectedIndices}
        rules={rules}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onSuccess={(bucketName, count) => {
          setIsBulkDeleteModalOpen(false)
          setSelectedIndices([])
          const { message, ...options } = getLifecycleRulesDeletedToast(bucketName, count)
          toast.success(message, options)
        }}
        onError={(bucketName, errorMessage, count) => {
          const { message, ...options } = getLifecycleRulesDeleteErrorToast(bucketName, count, errorMessage)
          toast.error(message, options)
        }}
        onMutatingChange={setIsBulkDeleteMutating}
      />

      {/* Add/Edit rule modal */}
      <LifecycleRuleModal
        isOpen={isRuleModalOpen}
        bucketName={bucketName}
        editingIndex={editingRuleIndex}
        onClose={() => {
          setIsRuleModalOpen(false)
          setEditingRuleIndex(null)
        }}
        onSuccess={(bucketName) => {
          setIsRuleModalOpen(false)
          setEditingRuleIndex(null)
          const { message, ...options } = getLifecycleSavedToast(bucketName)
          toast.success(message, options)
        }}
        onError={(bucketName, errorMessage) => {
          const { message, ...options } = getLifecycleSaveErrorToast(bucketName, errorMessage)
          toast.error(message, options)
        }}
        onMutatingChange={setIsRuleModalMutating}
      />
    </>
  )
}
