import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Spinner, Message, Button, Stack, toast } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { CorsRulesTable } from "./CorsRulesTable"
import { CorsRuleModal } from "./CorsRuleModal"
import { DeleteCorsModal } from "./DeleteCorsModal"
import {
  getCorsSavedToast,
  getCorsSaveErrorToast,
  getCorsDeletedToast,
  getCorsDeleteErrorToast,
} from "./BucketToastNotifications"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"
import { ALLOWED_METHODS } from "./CorsRuleForm"
import { validateCorsRules } from "./corsValidation"

interface CorsRulesTabProps {
  bucketName: string
}

/**
 * CORS Rules tab container
 *
 * Manages CORS configuration for a Ceph bucket with full CRUD operations.
 * Uses draft-state-then-explicit-Save pattern to avoid hitting the 10/min rate limit.
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

  // Draft state (local edits before saving)
  const [draftRules, setDraftRules] = useState<CorsRuleRead[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Initialize draft from server data
  useEffect(() => {
    if (corsData && !hasUnsavedChanges) {
      setDraftRules(corsData.corsRules ?? [])
    }
  }, [corsData, hasUnsavedChanges])

  // Mutations
  const setMutation = trpcReact.storage.ceph.cors.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      setHasUnsavedChanges(false)
      setValidationError(null)
      const { message, ...options } = getCorsSavedToast(bucketName)
      toast.success(message, options)
    },
    onError: (error) => {
      // Check if it's a validation error from the server by tRPC error code
      if (error.data?.code === "BAD_REQUEST") {
        setValidationError(error.message)
      }
      const { message, ...options } = getCorsSaveErrorToast(bucketName, error.message)
      toast.error(message, options)
    },
  })

  const deleteMutation = trpcReact.storage.ceph.cors.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      setHasUnsavedChanges(false)
      setValidationError(null)
      const { message, ...options } = getCorsDeletedToast(bucketName)
      toast.success(message, options)
    },
    onError: (error) => {
      const { message, ...options } = getCorsDeleteErrorToast(bucketName, error.message)
      toast.error(message, options)
    },
  })

  const isMutating = setMutation.isPending || deleteMutation.isPending

  // Check if draft differs from server state (key-order-insensitive)
  useEffect(() => {
    const serverRules = corsData?.corsRules ?? []

    // Normalize rules for comparison: sort object keys to avoid false positives
    const normalizeRule = (rule: CorsRuleRead) => {
      const sortedKeys = Object.keys(rule).sort()
      const normalized: Record<string, unknown> = {}
      sortedKeys.forEach((key) => {
        normalized[key] = rule[key as keyof CorsRuleRead]
      })
      return normalized
    }

    const normalizedDraft = draftRules.map(normalizeRule)
    const normalizedServer = serverRules.map(normalizeRule)

    const hasChanges = JSON.stringify(normalizedDraft) !== JSON.stringify(normalizedServer)
    setHasUnsavedChanges(hasChanges)
  }, [draftRules, corsData])

  const handleSave = () => {
    setValidationError(null)

    // If no rules, call delete instead of set
    if (draftRules.length === 0) {
      deleteMutation.mutate({ project_id: projectId, bucketName })
      return
    }

    // Client-side validation before calling the server
    const validationResult = validateCorsRules(draftRules, ALLOWED_METHODS)
    if (!validationResult.isValid) {
      setValidationError(validationResult.errors.join("; "))
      return
    }

    // Server will also validate, but we've already narrowed the types correctly
    setMutation.mutate({
      project_id: projectId,
      bucketName,
      corsConfiguration: { CORSRules: validationResult.validatedRules },
    })
  }

  const handleDiscard = () => {
    setDraftRules(corsData?.corsRules ?? [])
    setHasUnsavedChanges(false)
    setValidationError(null)
  }

  const handleAddRule = () => {
    setEditingRuleIndex(null)
    setIsRuleModalOpen(true)
  }

  const handleEditRule = (index: number) => {
    setEditingRuleIndex(index)
    setIsRuleModalOpen(true)
  }

  const handleRuleModalSubmit = (rule: CorsRuleRead) => {
    if (editingRuleIndex === null) {
      // Adding new rule
      setDraftRules([...draftRules, rule])
    } else {
      // Editing existing rule
      const newRules = [...draftRules]
      newRules[editingRuleIndex] = rule
      setDraftRules(newRules)
    }
    setIsRuleModalOpen(false)
    setEditingRuleIndex(null)
  }

  const handleDeleteRule = (index: number) => {
    const newRules = draftRules.filter((_, i) => i !== index)
    setDraftRules(newRules)
  }

  const handleDeleteAll = () => {
    setIsDeleteModalOpen(true)
  }

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
      {/* Validation error */}
      {validationError && (
        <Message variant="error" title={t`Validation Error`}>
          <Trans>Cannot save CORS configuration: {validationError}</Trans>
        </Message>
      )}

      {/* Save/Discard bar */}
      {hasUnsavedChanges && !isMutating && (
        <Message variant="info" title={t`Unsaved Changes`}>
          <Stack direction="horizontal" gap="2" alignment="center">
            <span>
              <Trans>You have unsaved changes to the CORS configuration.</Trans>
            </span>
            <Button variant="primary" onClick={handleSave} size="small">
              <Trans>Save</Trans>
            </Button>
            <Button variant="subdued" onClick={handleDiscard} size="small">
              <Trans>Discard</Trans>
            </Button>
          </Stack>
        </Message>
      )}

      {/* Table */}
      <CorsRulesTable
        rules={draftRules}
        onAddRule={handleAddRule}
        onEditRule={handleEditRule}
        onDeleteRule={handleDeleteRule}
        isMutating={isMutating}
      />

      {/* Delete all button (only if rules exist) */}
      {draftRules.length > 0 && (
        <div className="flex justify-end">
          <Button variant="subdued" onClick={handleDeleteAll} disabled={isMutating}>
            <Trans>Delete All Rules</Trans>
          </Button>
        </div>
      )}

      {/* Delete modal */}
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

      {/* Add/Edit rule modal */}
      <CorsRuleModal
        isOpen={isRuleModalOpen}
        editingRule={editingRuleIndex !== null ? draftRules[editingRuleIndex] : null}
        editingIndex={editingRuleIndex}
        onSubmit={handleRuleModalSubmit}
        onClose={() => {
          setIsRuleModalOpen(false)
          setEditingRuleIndex(null)
        }}
      />
    </Stack>
  )
}
