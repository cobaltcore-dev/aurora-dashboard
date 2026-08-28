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
import { CorsRulesTable } from "./CorsRulesTable"
import { CorsRuleModal } from "./CorsRuleModal"
import { DeleteCorsRulesModal } from "./DeleteCorsRulesModal"
import {
  getCorsSavedToast,
  getCorsSaveErrorToast,
  getCorsRulesDeletedToast,
  getCorsRulesDeleteErrorToast,
} from "./BucketToastNotifications"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"

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
  const navigate = useNavigate({ from: Route.fullPath })
  const { permissions } = useCephPermissions(projectId)

  // Sort and search state are persisted in the URL
  const { corsSortBy, corsSortDirection, corsSearch = "" } = Route.useSearch()

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
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)

  // Mutation state for modals (to disable row actions during mutations)
  const [isRuleModalMutating, setIsRuleModalMutating] = useState(false)
  const [isBulkDeleteMutating, setIsBulkDeleteMutating] = useState(false)

  // Selection state for bulk actions
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  const sortSettings: SortSettings = {
    options: [
      { label: t`Rule ID`, value: "ID" },
      { label: t`Allowed Origins`, value: "AllowedOrigins" },
      { label: t`Allowed Methods`, value: "AllowedMethods" },
      { label: t`Allowed Headers`, value: "AllowedHeaders" },
      { label: t`Expose Headers`, value: "ExposeHeaders" },
      { label: t`Max Age`, value: "MaxAgeSeconds" },
    ],
    sortBy: corsSortBy ?? "ID",
    sortDirection: corsSortDirection ?? "asc",
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const value = typeof term === "string" ? term : ""
    startTransition(() => {
      navigate({
        search: (prev) => ({ ...prev, corsSearch: value || undefined }),
      })
    })
  }

  const handleSortChange = (newSortSettings: SortSettings) => {
    const resolvedSortBy = (newSortSettings.sortBy?.toString() || "ID") as
      "ID" | "AllowedOrigins" | "AllowedMethods" | "AllowedHeaders" | "ExposeHeaders" | "MaxAgeSeconds"
    const resolvedDirection = (newSortSettings.sortDirection || "asc") as "asc" | "desc"
    startTransition(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          corsSortBy: resolvedSortBy,
          corsSortDirection: resolvedDirection,
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
  const rules = corsData?.corsRules ?? []

  // Sort rules based on sort settings
  const sortRules = (rules: CorsRuleRead[]): CorsRuleRead[] => {
    return [...rules].sort((a, b) => {
      let comparison: number

      switch (corsSortBy ?? "ID") {
        case "ID":
          comparison = (a.ID || "").localeCompare(b.ID || "")
          break
        case "AllowedOrigins":
          comparison = a.AllowedOrigins.join(", ").localeCompare(b.AllowedOrigins.join(", "))
          break
        case "AllowedMethods":
          comparison = a.AllowedMethods.join(", ").localeCompare(b.AllowedMethods.join(", "))
          break
        case "AllowedHeaders":
          comparison = (a.AllowedHeaders || []).join(", ").localeCompare((b.AllowedHeaders || []).join(", "))
          break
        case "ExposeHeaders":
          comparison = (a.ExposeHeaders || []).join(", ").localeCompare((b.ExposeHeaders || []).join(", "))
          break
        case "MaxAgeSeconds":
          comparison = (a.MaxAgeSeconds ?? -1) - (b.MaxAgeSeconds ?? -1)
          break
        default:
          comparison = (a.ID || "").localeCompare(b.ID || "")
      }

      return (corsSortDirection ?? "asc") === "desc" ? -comparison : comparison
    })
  }

  // Filter rules based on search term (by Rule ID)
  const filteredRulesWithIndices = sortRules(rules)
    .map((rule) => ({ rule, originalIndex: rules.indexOf(rule) }))
    .filter(({ rule }) => {
      if (!corsSearch) return true
      const ruleId = rule.ID || ""
      return ruleId.toLowerCase().includes(corsSearch.toLowerCase())
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
    <>
      {/* Zone 1 — Sort controls and Create rule button (outside DataGridToolbar) */}
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        <Stack gap="0.5" alignment="center">
          <SortInput
            options={sortSettings.options}
            sortBy={sortSettings.sortBy}
            sortDirection={sortSettings.sortDirection ?? "asc"}
            selectClassName="min-w-52"
            selectWidth="auto"
            onSortByChange={(value) =>
              handleSortChange({ ...sortSettings, sortBy: value, sortDirection: sortSettings.sortDirection })
            }
            onSortDirectionChange={(direction) => handleSortChange({ ...sortSettings, sortDirection: direction })}
          />
        </Stack>
        {permissions.canUpdateCors && (
          <Button variant="primary" onClick={handleAddRule}>
            <Trans>Create CORS Rule</Trans>
          </Button>
        )}
      </Stack>

      {/* Zone 2 — Bulk actions toolbar (inside DataGridToolbar) */}
      <DataGridToolbar>
        <Stack direction="vertical" gap="2">
          <Stack distribution="end" alignment="center">
            <SearchInput
              placeholder={t`Search CORS rules...`}
              data-testid="cors-rules-searchbar"
              value={corsSearch}
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
            {permissions.canDeleteCors ? (
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
                        label={i18n._(
                          plural(selectedIndices.length, { one: "Delete # Rule", other: "Delete # Rules" })
                        )}
                        onClick={handleBulkDelete}
                        data-testid="bulk-delete-rules-action"
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
      <CorsRulesTable
        bucketName={bucketName}
        rulesWithIndices={filteredRulesWithIndices}
        selectedIndices={selectedIndices}
        onToggleSelectRule={handleToggleSelectRule}
        onEditRule={handleEditRule}
        onDeleteRule={handleDeleteRule}
        isMutating={isRuleModalMutating || isBulkDeleteMutating}
        isFiltered={!!corsSearch}
        canUpdateCors={permissions.canUpdateCors}
        canDeleteCors={permissions.canDeleteCors}
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
        onMutatingChange={setIsBulkDeleteMutating}
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
        onMutatingChange={setIsRuleModalMutating}
      />
    </>
  )
}
