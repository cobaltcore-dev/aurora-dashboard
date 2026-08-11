import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { plural } from "@lingui/core/macro"
import { i18n } from "@lingui/core"
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
import { CorsRulesTable } from "./CorsRulesTable"
import { CorsRuleModal } from "./CorsRuleModal"
import { DeleteCorsModal } from "./DeleteCorsModal"
import { DeleteCorsRulesModal } from "./DeleteCorsRulesModal"
import {
  getCorsSavedToast,
  getCorsSaveErrorToast,
  getCorsDeleteErrorToast,
  getCorsRulesDeletedToast,
  getCorsRulesDeleteErrorToast,
} from "./BucketToastNotifications"

interface CorsRulesTabProps {
  bucketName: string
}

/**
 * CORS Rules tab container
 *
 * Manages CORS configuration for a Ceph bucket with full CRUD operations.
 * Each operation (add/edit/delete) immediately updates the server configuration.
 */
export function CorsRulesTab({ bucketName }: CorsRulesTabProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  // Server state
  const {
    data: corsData,
    isLoading,
    error,
  } = trpcReact.storage.ceph.cors.get.useQuery(
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)

  // Selection state for bulk actions
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  // Search state
  const [searchTerm, setSearchTerm] = useState("")

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

  // Current rules from server
  const rules = corsData?.corsRules ?? []

  // Filter rules based on search term (by Rule ID)
  const filteredRulesWithIndices = rules
    .map((rule, index) => ({ rule, originalIndex: index }))
    .filter(({ rule }) => {
      if (!searchTerm) return true
      const ruleId = rule.ID || ""
      return ruleId.toLowerCase().includes(searchTerm.toLowerCase())
    })

  // Get indices of filtered rules for select-all logic
  const filteredIndices = filteredRulesWithIndices.map(({ originalIndex }) => originalIndex)

  const allFilteredSelected = filteredIndices.length > 0 && filteredIndices.every((i) => selectedIndices.includes(i))
  const someFilteredSelected = filteredIndices.some((i) => selectedIndices.includes(i)) && !allFilteredSelected

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner variant="primary" size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Message variant="error" title={t`Failed to load CORS configuration`}>
        {error.message}
      </Message>
    )
  }

  return (
    <Stack direction="vertical" gap="4">
      {/* Zone 1 — Create rule button (outside DataGridToolbar) */}
      <Stack distribution="end" alignment="center" gap="2">
        <Button variant="primary" onClick={handleAddRule}>
          <Trans>Create rule</Trans>
        </Button>
      </Stack>

      {/* Zone 2 — Bulk actions toolbar (inside DataGridToolbar) */}
      <DataGridToolbar>
        <Stack direction="vertical" gap="2">
          <Stack distribution="end" alignment="center">
            <SearchInput
              placeholder={t`Search by Rule ID...`}
              data-testid="cors-rules-searchbar"
              value={searchTerm}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              onSearch={(v) => setSearchTerm(typeof v === "string" ? v : "")}
              onClear={() => setSearchTerm("")}
            />
          </Stack>
          <Divider />
          <Stack distribution="between" gap="2" alignment="center" className="text-sm">
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
                  <Button disabled={selectedIndices.length === 0} size="small" icon="moreVert" label={t`Actions`} />
                </PopupMenuToggle>
                {selectedIndices.length > 0 && (
                  <PopupMenuOptions>
                    <PopupMenuItem
                      label={i18n._(plural(selectedIndices.length, { one: "Delete # Rule", other: "Delete # Rules" }))}
                      onClick={handleBulkDelete}
                      data-testid="bulk-delete-rules-action"
                    />
                  </PopupMenuOptions>
                )}
              </PopupMenu>
            </Stack>
            <span className="theme-color-text-light">
              {filteredRulesWithIndices.length} {filteredRulesWithIndices.length === 1 ? t`rule` : t`rules`}
            </span>
          </Stack>
        </Stack>
      </DataGridToolbar>

      {/* Table */}
      <CorsRulesTable
        bucketName={bucketName}
        rulesWithIndices={filteredRulesWithIndices}
        selectedIndices={selectedIndices}
        onToggleSelectRule={handleToggleSelectRule}
        onEditRule={handleEditRule}
        isMutating={false}
        isFiltered={!!searchTerm}
      />

      {/* Delete all CORS modal */}
      <DeleteCorsModal
        isOpen={isDeleteModalOpen}
        bucketName={bucketName}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={() => {
          setIsDeleteModalOpen(false)
          utils.storage.ceph.cors.get.invalidate()
        }}
        onError={(_, errorMessage) => {
          const { message, ...options } = getCorsDeleteErrorToast(bucketName, errorMessage)
          toast.error(message, options)
        }}
      />

      {/* Bulk delete rules modal */}
      <DeleteCorsRulesModal
        isOpen={isBulkDeleteModalOpen}
        bucketName={bucketName}
        ruleIndices={selectedIndices}
        rules={rules}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onSuccess={(bucketName, count) => {
          setIsBulkDeleteModalOpen(false)
          setSelectedIndices([])
          const { message, ...options } = getCorsRulesDeletedToast(bucketName, count)
          toast.success(message, options)
        }}
        onError={(bucketName, errorMessage, count) => {
          const { message, ...options } = getCorsRulesDeleteErrorToast(bucketName, count, errorMessage)
          toast.error(message, options)
        }}
      />

      {/* Add/Edit rule modal */}
      <CorsRuleModal
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
          const { message, ...options } = getCorsSavedToast(bucketName)
          toast.success(message, options)
        }}
        onError={(bucketName, errorMessage) => {
          const { message, ...options } = getCorsSaveErrorToast(bucketName, errorMessage)
          toast.error(message, options)
        }}
      />
    </Stack>
  )
}
