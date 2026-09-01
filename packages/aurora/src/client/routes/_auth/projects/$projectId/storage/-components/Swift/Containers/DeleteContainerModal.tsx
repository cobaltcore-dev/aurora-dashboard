import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Form, FormSection, TextInput, Stack, Spinner, Checkbox } from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface DeleteContainerModalProps {
  isOpen: boolean
  container: ContainerSummary | null
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onError?: (containerName: string, errorMessage: string) => void
}

export const DeleteContainerModal = ({ isOpen, container, onClose, onSuccess, onError }: DeleteContainerModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [versionsConfirmed, setVersionsConfirmed] = useState(false)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.swift.container.delete",
  })

  const formSchema = z.object({
    confirm: z.string().refine((value) => value === "delete", {
      message: t`The text must match "delete"`,
    }),
  })

  const form = useForm({
    defaultValues: {
      confirm: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      if (!container || objectsError || metaError || deleteContainerMutation.isPending) return
      if (isVersioned && !versionsConfirmed) return

      markSubmitted()
      deleteContainerMutation.mutate({ project_id: projectId, container: container.name })
    },
  })

  const canDelete = useStore(form.store, (state) => state.isSubmitting || state.values.confirm !== "delete")

  const utils = trpcReact.useUtils()

  // Fetch actual objects to get accurate real-time state —
  // container.count can lag due to Swift eventual consistency
  const {
    data: objects,
    isLoading: isLoadingObjects,
    error: objectsError,
  } = trpcReact.storage.swift.listObjects.useQuery(
    { project_id: projectId, container: container?.name ?? "", format: "json", limit: 1 },
    { enabled: isOpen && container !== null }
  )

  // Fetch container metadata to check if versioning is enabled
  const { data: containerMetadata, error: metaError } = trpcReact.storage.swift.getContainerMetadata.useQuery(
    { project_id: projectId, container: container?.name ?? "" },
    { enabled: isOpen && container !== null }
  )

  // Swift versioning v2: x-versions-enabled header; v1: x-versions-location / x-history-location
  const isVersioned = !!(
    containerMetadata?.versionsEnabled ||
    containerMetadata?.versionsLocation ||
    containerMetadata?.historyLocation
  )

  const deleteContainerMutation = trpcReact.storage.swift.deleteContainer.useMutation({
    onSuccess: () => {
      utils.storage.swift.listContainers.invalidate()
      onSuccess?.(container!.name)
    },
    onError: (error) => {
      onError?.(container!.name, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  useEffect(() => {
    if (!isOpen) {
      setVersionsConfirmed(false)
      deleteContainerMutation.reset()
      form.reset()
      resetTracking()
    }
  }, [isOpen, container?.name, resetTracking])

  const handleClose = () => {
    trackClose()
    setVersionsConfirmed(false)
    deleteContainerMutation.reset()
    onClose()
  }

  if (!isOpen || !container) return null

  const actualObjectCount = objects?.length ?? 0

  // Container has objects — cannot delete, must empty first.
  // Also covers the Swift consistency delay where count > 0 but listed objects === 0:
  // we trust container.count here to avoid letting the user delete a non-empty container.
  const hasObjects = !isLoadingObjects && (actualObjectCount > 0 || container.count > 0)
  // Swift eventual consistency — count > 0 but listing returned 0 objects,
  // likely because a recent empty/delete hasn't propagated yet.
  const isConsistencyDelay = !isLoadingObjects && container.count > 0 && actualObjectCount === 0
  const hasPreflightError = !!(objectsError || metaError)

  const modalTitle = (
    <span className="flex max-w-100 items-center gap-2">
      <span className="shrink-0">
        <Trans>Delete container:</Trans>
      </span>
      <span className="truncate" title={container.name}>
        {container.name}
      </span>
    </span>
  )

  return (
    <Modal
      title={modalTitle}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={hasObjects ? t`Close` : t`Delete Container`}
      confirmButtonVariant={hasObjects ? "primary" : "primary-danger"}
      onConfirm={hasObjects ? handleClose : form.handleSubmit}
      cancelButtonLabel={hasObjects ? undefined : t`Cancel`}
      size="small"
      disableConfirmButton={
        isLoadingObjects ||
        hasPreflightError ||
        deleteContainerMutation.isPending ||
        (!hasObjects && canDelete) ||
        (!hasObjects && isVersioned && !versionsConfirmed)
      }
    >
      {(objectsError || metaError) && (
        <Stack direction="vertical" gap="2" className="mb-4" role="alert" aria-live="assertive">
          {objectsError && (
            <p className="text-theme-error">
              {(() => {
                const errorMessage = objectsError.message
                return <Trans>Failed to load container objects: {errorMessage}</Trans>
              })()}
            </p>
          )}
          {metaError && (
            <p className="text-theme-error">
              {(() => {
                const errorMessage = metaError.message
                return <Trans>Failed to load container properties: {errorMessage}</Trans>
              })()}
            </p>
          )}
        </Stack>
      )}
      {isLoadingObjects ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Loading...</Trans>
        </Stack>
      ) : hasObjects ? (
        // ── Container has objects — block deletion ───────────────────────────
        <Stack direction="vertical" gap="3">
          <p className="text-theme-default">
            <Trans>The container cannot be deleted as it contains objects. Empty the container first.</Trans>
          </p>
          {isConsistencyDelay && (
            <p className="text-theme-default">
              <Trans>
                The container metadata reports objects but none were listed. This may be a temporary synchronization
                delay — please wait a moment and try again.
              </Trans>
            </p>
          )}
        </Stack>
      ) : (
        // ── Container is empty — allow deletion ──────────────────────────────
        <Stack direction="vertical" gap="6">
          <p className="text-theme-default">
            <Trans>The container will be deleted. This action is permanent and cannot be undone.</Trans>
            <br />
            <Trans>
              To confirm type <strong>delete</strong> in the field below.
            </Trans>
          </p>
          {isVersioned && (
            <Checkbox
              label={t`I confirm that all existing versions will also be deleted`}
              checked={versionsConfirmed}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVersionsConfirmed(e.target.checked)}
            />
          )}
          <Form
            className="mb-0"
            id="delete-container-form"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FormSection>
              <form.Field
                name="confirm"
                validators={{
                  onSubmit: ({ value }) => {
                    if (value !== "delete") {
                      return t`The text must match "delete"`
                    }
                    return undefined
                  },
                }}
                children={(field) => (
                  <TextInput
                    label={t`Type "delete" to confirm`}
                    required
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    invalid={!!field.state.meta.errors.length}
                    errortext={
                      field.state.meta.errors.map((e) => (typeof e === "string" ? e : e?.message)).join(", ") ||
                      undefined
                    }
                    disabled={deleteContainerMutation.isPending}
                    autoFocus
                    placeholder="delete"
                  />
                )}
              />
            </FormSection>
          </Form>
        </Stack>
      )}
    </Modal>
  )
}
