import { useEffect, useMemo, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Spinner, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import type { CorsRule } from "@/server/Storage/types/ceph"
import { CorsRulesViewer } from "./CorsRulesViewer"
import { CorsRuleForm } from "./CorsRuleForm"

enum Tab {
  VIEW = "view",
  ADD = "add",
}

interface CorsModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const CorsModal = ({ isOpen, bucketName, onClose, onSuccess, onError }: CorsModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>(Tab.VIEW)
  const [currentRules, setCurrentRules] = useState<CorsRule[]>([])

  const { trackClose, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.cors",
  })

  const {
    data: corsData,
    isLoading: isCorsLoading,
    error: corsError,
  } = trpcReact.storage.ceph.cors.get.useQuery(
    {
      project_id: projectId,
      bucketName,
    },
    {
      enabled: isOpen && !!projectId,
      retry: false,
    }
  )

  useEffect(() => {
    if (!isOpen) return
    setCurrentRules(corsData?.corsRules || [])
  }, [isOpen, corsData])

  const setMutation = trpcReact.storage.ceph.cors.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(bucketName)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
  })

  const deleteMutation = trpcReact.storage.ceph.cors.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(bucketName)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
  })

  const handleClose = () => {
    setMutation.reset()
    deleteMutation.reset()
    setCurrentRules([])
    setEditingRuleIndex(null)
    setActiveTab(Tab.VIEW)
    resetTracking()
    onClose()
  }

  const handleRuleSubmit = (newRule: CorsRule) => {
    if (editingRuleIndex !== null) {
      const updatedRules = [...currentRules]
      updatedRules[editingRuleIndex] = newRule
      setCurrentRules(updatedRules)
      setEditingRuleIndex(null)
    } else {
      setCurrentRules([...currentRules, newRule])
    }
    setActiveTab(Tab.VIEW)
  }

  const handleEditRule = (index: number) => {
    setEditingRuleIndex(index)
    setActiveTab(Tab.ADD)
  }

  const handleDeleteRule = (index: number) => {
    setCurrentRules(currentRules.filter((_, i) => i !== index))
    if (editingRuleIndex === index) {
      setEditingRuleIndex(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingRuleIndex(null)
  }

  const handleSaveConfiguration = () => {
    if (currentRules.length === 0) {
      deleteMutation.mutate({ project_id: projectId, bucketName })
    } else {
      setMutation.mutate({
        project_id: projectId,
        bucketName,
        corsConfiguration: { CORSRules: currentRules },
      })
    }
  }

  const handleDeleteAllRules = () => {
    deleteMutation.mutate({ project_id: projectId, bucketName })
  }

  const hasChanges = useMemo(() => {
    const originalRules = corsData?.corsRules || []
    return JSON.stringify(currentRules) !== JSON.stringify(originalRules)
  }, [currentRules, corsData])

  const isSaving = setMutation.isPending || deleteMutation.isPending
  const canSaveConfiguration = !isSaving && hasChanges
  const hasWildcardOrigin = currentRules.some((rule) => rule.AllowedOrigins.includes("*"))

  if (!isOpen) return null

  return (
    <Modal
      key={bucketName}
      title={t`CORS Configuration`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={t`Save Configuration`}
      onConfirm={handleSaveConfiguration}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!canSaveConfiguration}
      size="large"
    >
      <Stack direction="vertical" gap="4">
        {isCorsLoading && (
          <div className="flex items-center justify-center py-8">
            <Spinner variant="primary" size="large" />
          </div>
        )}

        {corsError && (
          <Message variant="error" title={t`Failed to load CORS configuration`}>
            {corsError.message}
          </Message>
        )}

        {setMutation.error && (
          <Message variant="error" title={t`Failed to save CORS configuration`}>
            {setMutation.error.message}
          </Message>
        )}

        {deleteMutation.error && (
          <Message variant="error" title={t`Failed to delete CORS configuration`}>
            {deleteMutation.error.message}
          </Message>
        )}

        {hasWildcardOrigin && (
          <Message variant="warning" title={t`Security Warning`}>
            <Trans>
              Using wildcard (*) for AllowedOrigins allows any website to access your bucket. Only use this for truly
              public resources.
            </Trans>
          </Message>
        )}

        {!isCorsLoading && !corsError && (
          <>
            <div className="border-theme-default flex gap-2 border-b pb-2">
              <button
                type="button"
                onClick={() => setActiveTab(Tab.VIEW)}
                className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === Tab.VIEW
                    ? "bg-theme-background-lvl-1 text-theme-high border-theme-accent border-b-2"
                    : "text-theme-default hover:text-theme-high"
                }`}
              >
                <Trans>View Rules</Trans> ({currentRules.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(Tab.ADD)}
                className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === Tab.ADD
                    ? "bg-theme-background-lvl-1 text-theme-high border-theme-accent border-b-2"
                    : "text-theme-default hover:text-theme-high"
                }`}
              >
                {editingRuleIndex !== null ? <Trans>Edit Rule</Trans> : <Trans>Add Rule</Trans>}
              </button>
            </div>

            {activeTab === Tab.VIEW && (
              <CorsRulesViewer
                rules={currentRules}
                onAddRule={() => setActiveTab(Tab.ADD)}
                onEditRule={handleEditRule}
                onDeleteRule={handleDeleteRule}
                onDeleteAllRules={handleDeleteAllRules}
              />
            )}

            {activeTab === Tab.ADD && (
              <CorsRuleForm
                editingRule={editingRuleIndex !== null ? currentRules[editingRuleIndex] : null}
                onSubmit={handleRuleSubmit}
                onCancel={handleCancelEdit}
                isSaving={isSaving}
              />
            )}
          </>
        )}
      </Stack>
    </Modal>
  )
}
