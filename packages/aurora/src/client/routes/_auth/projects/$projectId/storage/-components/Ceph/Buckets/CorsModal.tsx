import { useEffect, useMemo, useState, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Spinner, Message, Button, ModalFooter, ButtonRow } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import type { CorsRuleRead, CorsRule } from "@/server/Storage/types/ceph"
import { CorsRulesViewer } from "./CorsRulesViewer"
import { CorsRuleForm } from "./CorsRuleForm"

enum ViewState {
  EMPTY = "empty",
  LIST = "list",
  FORM = "form",
}

interface CorsModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string, operation: "save" | "delete") => void
  onError?: (bucketName: string, errorMessage: string, operation: "save" | "delete") => void
}

export const CorsModal = ({ isOpen, bucketName, onClose, onSuccess, onError }: CorsModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [viewState, setViewState] = useState<ViewState>(ViewState.EMPTY)
  const [currentRules, setCurrentRules] = useState<CorsRuleRead[]>([])

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

  // Initialize state when modal opens and data is available
  const prevIsOpenRef = useRef(isOpen)
  const hasInitialized = useRef(false)

  useEffect(() => {
    const isJustOpened = isOpen && !prevIsOpenRef.current
    prevIsOpenRef.current = isOpen

    // Reset initialization flag when modal closes
    if (!isOpen) {
      hasInitialized.current = false
      return
    }

    // Initialize when modal just opened or when data loads for the first time
    if ((isJustOpened || !hasInitialized.current) && corsData) {
      const rules = corsData.corsRules || []
      setCurrentRules(rules)
      setViewState(rules.length === 0 ? ViewState.EMPTY : ViewState.LIST)
      hasInitialized.current = true
    }
  }, [isOpen, corsData])

  const setMutation = trpcReact.storage.ceph.cors.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(bucketName, "save")
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message, "save")
    },
  })

  const deleteMutation = trpcReact.storage.ceph.cors.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(bucketName, "delete")
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message, "delete")
    },
  })

  const handleClose = () => {
    trackClose()
    setMutation.reset()
    deleteMutation.reset()
    setCurrentRules([])
    setEditingRuleIndex(null)
    setViewState(ViewState.EMPTY)
    resetTracking()
    onClose()
  }

  // Reset internal state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentRules([])
      setEditingRuleIndex(null)
      setViewState(ViewState.EMPTY)
    }
  }, [isOpen])

  const handleRequestClose = () => {
    trackClose()
    handleClose()
  }

  const handleRuleSubmit = (newRule: CorsRuleRead) => {
    if (editingRuleIndex !== null) {
      const updatedRules = [...currentRules]
      updatedRules[editingRuleIndex] = newRule
      setCurrentRules(updatedRules)
      setEditingRuleIndex(null)
    } else {
      setCurrentRules([...currentRules, newRule])
    }
    setViewState(ViewState.LIST)
  }

  const handleEditRule = (index: number) => {
    setEditingRuleIndex(index)
    setViewState(ViewState.FORM)
  }

  const handleDeleteRule = (index: number) => {
    const updatedRules = currentRules.filter((_, i) => i !== index)
    setCurrentRules(updatedRules)

    // Always clear editing state and return to list/empty view when deleting
    setEditingRuleIndex(null)

    // If we just deleted the last rule, switch to empty state, otherwise stay in list view
    if (updatedRules.length === 0) {
      setViewState(ViewState.EMPTY)
    } else {
      setViewState(ViewState.LIST)
    }
  }

  const handleCancelEdit = () => {
    setEditingRuleIndex(null)
    setViewState(currentRules.length === 0 ? ViewState.EMPTY : ViewState.LIST)
  }

  const handleAddNewRule = () => {
    setEditingRuleIndex(null)
    setViewState(ViewState.FORM)
  }

  const handleSaveConfiguration = () => {
    if (currentRules.length === 0) {
      deleteMutation.mutate({ project_id: projectId, bucketName })
    } else {
      // Cast to strict CorsRule[] for write validation - rules coming from form are guaranteed valid
      setMutation.mutate({
        project_id: projectId,
        bucketName,
        corsConfiguration: { CORSRules: currentRules as CorsRule[] },
      })
    }
  }

  const hasChanges = useMemo(() => {
    const originalRules = corsData?.corsRules || []
    return JSON.stringify(currentRules) !== JSON.stringify(originalRules)
  }, [currentRules, corsData])

  const isSaving = setMutation.isPending || deleteMutation.isPending
  const canSaveConfiguration = !isSaving && hasChanges && viewState !== ViewState.FORM
  const hasWildcardOrigin = currentRules.some((rule) => rule.AllowedOrigins.includes("*"))
  const shouldShowSaveButton = true // Always show save button

  if (!isOpen) return null

  return (
    <Modal
      key={bucketName}
      title={t`CORS Rules`}
      open={isOpen}
      onCancel={handleRequestClose}
      size="xl"
      modalFooter={
        <ModalFooter className="bg-theme-background-lvl-0 sticky bottom-0 z-10 flex justify-end">
          <ButtonRow>
            <Button variant="subdued" onClick={handleRequestClose}>
              <Trans>Cancel</Trans>
            </Button>
            {shouldShowSaveButton && (
              <Button variant="primary" onClick={handleSaveConfiguration} disabled={!canSaveConfiguration}>
                <Trans>Save</Trans>
              </Button>
            )}
          </ButtonRow>
        </ModalFooter>
      }
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
          <Message variant="warning" title={t`Wildcard Warning`}>
            <Trans>
              One or more rules use wildcard (*) for AllowedOrigins, which allows any website to access your bucket.
              Only use this for truly public resources.
            </Trans>
          </Message>
        )}

        {!isCorsLoading && !corsError && (
          <>
            {viewState === ViewState.EMPTY && (
              <>
                <p className="text-theme-default text-sm">
                  <Trans>
                    CORS (Cross-Origin Resource Sharing) controls which browser origins can access bucket content via
                    JavaScript. Essential for single-page applications, web-based uploads, and cross-domain hosting.
                  </Trans>
                </p>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleAddNewRule}>
                    <Trans>Add New Rule</Trans>
                  </Button>
                </div>
                <div className="border-theme-default border-t" />
                <div className="flex flex-col items-center justify-center py-8">
                  <h3 className="text-theme-high mb-2 text-base font-semibold">
                    <Trans>No rules</Trans>
                  </h3>
                  <p className="text-theme-light text-sm">
                    <Trans>There are no rules to display. Add New Rule using button above</Trans>
                  </p>
                </div>
              </>
            )}

            {viewState === ViewState.LIST && (
              <CorsRulesViewer
                rules={currentRules}
                onAddRule={handleAddNewRule}
                onEditRule={handleEditRule}
                onDeleteRule={handleDeleteRule}
              />
            )}

            {viewState === ViewState.FORM && (
              <CorsRuleForm
                key={editingRuleIndex ?? "new"}
                editingRule={editingRuleIndex !== null ? currentRules[editingRuleIndex] : null}
                onSubmit={handleRuleSubmit}
                onCancel={handleCancelEdit}
              />
            )}
          </>
        )}
      </Stack>
    </Modal>
  )
}
