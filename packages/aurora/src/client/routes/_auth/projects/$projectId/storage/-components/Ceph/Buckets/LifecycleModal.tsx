import { useEffect, useMemo, useState, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Spinner, Message, Button, ModalFooter, ButtonRow } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import type { LifecycleRuleRead, LifecycleRule } from "@/server/Storage/types/ceph"
import { LifecycleRulesViewer } from "./LifecycleRulesViewer"
import { LifecycleRuleForm } from "./LifecycleRuleForm"

// Helper to detect whole-bucket expiration rules (potentially dangerous)
function isWholeBucketExpirationRule(rule: LifecycleRuleRead): boolean {
  if (rule.Status !== "Enabled") return false
  if (!rule.Expiration) return false

  // Check if filter matches everything (no prefix, no tags, no size constraints)
  const filter = rule.Filter
  if (!filter) return true // No filter = whole bucket

  // Empty prefix or no conditions = whole bucket
  if (filter.Prefix === "" && !filter.Tag && !filter.And) return true
  if (!filter.Prefix && !filter.Tag && !filter.ObjectSizeGreaterThan && !filter.ObjectSizeLessThan && !filter.And)
    return true

  // And with only empty prefix = whole bucket
  if (
    filter.And &&
    (filter.And.Prefix === "" || !filter.And.Prefix) &&
    (!filter.And.Tags || filter.And.Tags.length === 0) &&
    !filter.And.ObjectSizeGreaterThan &&
    !filter.And.ObjectSizeLessThan
  )
    return true

  return false
}

enum ViewState {
  EMPTY = "empty",
  LIST = "list",
  FORM = "form",
}

interface LifecycleModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string, operation: "save" | "delete") => void
  onError?: (bucketName: string, errorMessage: string, operation: "save" | "delete") => void
}

export const LifecycleModal = ({ isOpen, bucketName, onClose, onSuccess, onError }: LifecycleModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [viewState, setViewState] = useState<ViewState>(ViewState.EMPTY)
  const [currentRules, setCurrentRules] = useState<LifecycleRuleRead[]>([])
  const [loadedSnapshot, setLoadedSnapshot] = useState<string | null>(null)
  const [concurrencyError, setConcurrencyError] = useState<string | null>(null)

  const { trackClose, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.lifecycle",
  })

  const {
    data: lifecycleData,
    isLoading: isLifecycleLoading,
    error: lifecycleError,
  } = trpcReact.storage.ceph.lifecycle.get.useQuery(
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
    if ((isJustOpened || !hasInitialized.current) && lifecycleData) {
      const rules = lifecycleData.rules || []
      setCurrentRules(rules)
      setLoadedSnapshot(JSON.stringify(rules))
      setConcurrencyError(null)
      setViewState(rules.length === 0 ? ViewState.EMPTY : ViewState.LIST)
      hasInitialized.current = true
    }
  }, [isOpen, lifecycleData])

  const setMutation = trpcReact.storage.ceph.lifecycle.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
      onSuccess?.(bucketName, "save")
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message, "save")
    },
  })

  const deleteMutation = trpcReact.storage.ceph.lifecycle.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
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
    setLoadedSnapshot(null)
    setConcurrencyError(null)
    setEditingRuleIndex(null)
    setViewState(ViewState.EMPTY)
    resetTracking()
    onClose()
  }

  // Reset internal state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentRules([])
      setLoadedSnapshot(null)
      setConcurrencyError(null)
      setEditingRuleIndex(null)
      setViewState(ViewState.EMPTY)
    }
  }, [isOpen])

  const handleRequestClose = () => {
    trackClose()
    handleClose()
  }

  const handleRuleSubmit = (newRule: LifecycleRuleRead) => {
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

  const handleSaveConfiguration = async () => {
    // Concurrency guard: refetch and compare
    if (loadedSnapshot) {
      try {
        const freshData = await utils.storage.ceph.lifecycle.get.fetch({
          project_id: projectId,
          bucketName,
        })
        const freshSnapshot = JSON.stringify(freshData.rules || [])

        if (freshSnapshot !== loadedSnapshot) {
          setConcurrencyError(
            t`The lifecycle configuration changed since you opened this dialog. Close and reopen to reload.`
          )
          return
        }
      } catch {
        // If refetch fails, show error but don't proceed
        setConcurrencyError(t`Unable to verify configuration state. Please try again.`)
        return
      }
    }

    setConcurrencyError(null)

    if (currentRules.length === 0) {
      deleteMutation.mutate({ project_id: projectId, bucketName })
    } else {
      // Cast to strict LifecycleRule[] for write validation - rules coming from form are guaranteed valid
      setMutation.mutate({
        project_id: projectId,
        bucketName,
        lifecycleConfiguration: { Rules: currentRules as LifecycleRule[] },
      })
    }
  }

  const hasChanges = useMemo(() => {
    const originalRules = lifecycleData?.rules || []
    return JSON.stringify(currentRules) !== JSON.stringify(originalRules)
  }, [currentRules, lifecycleData])

  const wholeBucketExpirationRules = useMemo(() => {
    return currentRules.filter(isWholeBucketExpirationRule)
  }, [currentRules])

  const isSaving = setMutation.isPending || deleteMutation.isPending
  const canSaveConfiguration = !isSaving && hasChanges && viewState !== ViewState.FORM
  const shouldShowSaveButton = true // Always show save button

  if (!isOpen) return null

  return (
    <Modal
      key={bucketName}
      title={t`Lifecycle Rules`}
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
        {isLifecycleLoading && (
          <div className="flex items-center justify-center py-8">
            <Spinner variant="primary" size="large" />
          </div>
        )}

        {lifecycleError && (
          <Message variant="error" title={t`Failed to load lifecycle configuration`}>
            {lifecycleError.message}
          </Message>
        )}

        {setMutation.error && (
          <Message variant="error" title={t`Failed to save lifecycle configuration`}>
            {setMutation.error.message}
          </Message>
        )}

        {deleteMutation.error && (
          <Message variant="error" title={t`Failed to delete lifecycle configuration`}>
            {deleteMutation.error.message}
          </Message>
        )}

        {concurrencyError && (
          <Message variant="error" title={t`Configuration Changed`}>
            {concurrencyError}
          </Message>
        )}

        {wholeBucketExpirationRules.length > 0 && (
          <Message variant="warning" title={t`Whole-Bucket Expiration Warning`}>
            <Trans>
              {wholeBucketExpirationRules.length === 1
                ? "One rule will delete all objects in this bucket."
                : `${wholeBucketExpirationRules.length} rules will delete all objects in this bucket.`}{" "}
              Make sure this is intended before saving.
            </Trans>
          </Message>
        )}

        {!isLifecycleLoading && !lifecycleError && (
          <>
            {viewState === ViewState.EMPTY && (
              <>
                <p className="text-theme-default text-sm">
                  <Trans>
                    Lifecycle rules automate object management: expire (delete) objects after N days, transition to
                    different storage classes, clean up old versions, and abort incomplete multipart uploads.
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
              <LifecycleRulesViewer
                rules={currentRules}
                onAddRule={handleAddNewRule}
                onEditRule={handleEditRule}
                onDeleteRule={handleDeleteRule}
              />
            )}

            {viewState === ViewState.FORM && (
              <LifecycleRuleForm
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
