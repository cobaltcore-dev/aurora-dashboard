import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import {
  Modal,
  ModalFooter,
  Button,
  ButtonRow,
  Form,
  FormSection,
  TextInput,
  Stack,
  Spinner,
} from "@cloudoperators/juno-ui-components"
import { ContainerSummary, ObjectSummary } from "@/server/Storage/types/swift"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface EmptyContainerModalProps {
  isOpen: boolean
  container: ContainerSummary | null
  onClose: () => void
  onSuccess?: (containerName: string, deletedCount: number) => void
  onError?: (containerName: string, errorMessage: string) => void
}

export const EmptyContainerModal = ({ isOpen, container, onClose, onSuccess, onError }: EmptyContainerModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const containerNameRef = useRef("")

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.swift.container.empty",
  })

  const formSchema = z.object({
    confirm: z.string().refine((value) => value === "empty", {
      message: t`Type "empty" to confirm`,
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
      if (!container || emptyContainerMutation.isPending) return

      containerNameRef.current = container.name
      markSubmitted()
      emptyContainerMutation.mutate({ project_id: projectId, container: container.name })
    },
  })

  const canEmpty = useStore(form.store, (state) => state.isSubmitting || state.values.confirm !== "empty")

  const utils = trpcReact.useUtils()

  // Fetch actual objects to get accurate real-time state —
  // container.count can lag due to Swift eventual consistency
  const {
    data: objects,
    isLoading: isLoadingObjects,
    error: objectsError,
  } = trpcReact.storage.swift.listObjects.useQuery(
    { project_id: projectId, container: container?.name ?? "", format: "json", limit: 100 },
    { enabled: isOpen && container !== null }
  )

  const emptyContainerMutation = trpcReact.storage.swift.emptyContainer.useMutation({
    onSuccess: (deletedCount) => {
      utils.storage.swift.listContainers.invalidate()
      utils.storage.swift.listObjects.invalidate({ project_id: projectId, container: containerNameRef.current })
      onSuccess?.(containerNameRef.current, deletedCount)
    },
    onError: (error) => {
      onError?.(containerNameRef.current, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  const handleClose = () => {
    trackClose()
    form.reset()
    emptyContainerMutation.reset()
    resetTracking()
    onClose()
  }

  if (!isOpen || !container) return null

  const actualObjectCount = objects?.length ?? 0

  // ── Case 2: container.count === 0 and listed objects === 0 ────────────────
  // Container is genuinely empty
  const isTrulyEmpty = !isLoadingObjects && container.count === 0 && actualObjectCount === 0

  // ── Case 3: container.count > 0 but listed objects === 0 ──────────────────
  // Swift eventual consistency delay — metadata not yet synced after recent delete
  const isConsistencyDelay = !isLoadingObjects && container.count > 0 && actualObjectCount === 0

  const showEmptyInfo = isTrulyEmpty || isConsistencyDelay

  const modalTitle = (
    <span className="flex max-w-100 items-center gap-2">
      <span className="shrink-0">
        <Trans>Empty:</Trans>
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
      confirmButtonLabel={showEmptyInfo ? undefined : t`Empty Container`}
      confirmButtonVariant="primary-danger"
      onConfirm={showEmptyInfo ? undefined : form.handleSubmit}
      cancelButtonLabel={showEmptyInfo ? undefined : t`Cancel`}
      modalFooter={
        showEmptyInfo ? (
          <ModalFooter className="flex justify-end">
            <ButtonRow>
              <Button variant="primary" onClick={handleClose} data-testid="empty-info-close-button">
                <Trans>Close</Trans>
              </Button>
            </ButtonRow>
          </ModalFooter>
        ) : undefined
      }
      size="large"
      disableConfirmButton={isLoadingObjects || emptyContainerMutation.isPending || (!showEmptyInfo && canEmpty)}
    >
      {objectsError && (
        <p className="text-theme-error mb-4">
          {(() => {
            const errorMessage = objectsError.message
            return <Trans>Failed to load container objects: {errorMessage}</Trans>
          })()}
        </p>
      )}
      {isLoadingObjects ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Loading objects...</Trans>
        </Stack>
      ) : showEmptyInfo && !objectsError ? (
        // ── Case 2 & 3 ──────────────────────────────────────────────────────
        <p className="text-theme-default py-2">
          {isTrulyEmpty ? (
            <Trans>This container is already empty.</Trans>
          ) : (
            <Trans>
              This container appears empty — the object count may not have synced yet due to a recent operation.
            </Trans>
          )}
        </p>
      ) : !objectsError ? (
        // ── Case 1: container has objects ────────────────────────────────────
        <Stack direction="vertical" gap="6">
          <p className="text-theme-default">
            <Trans>
              This action is permanent. All objects in the container will be deleted and this cannot be undone.
            </Trans>
            <br />
            <Trans>
              <strong>Please note:</strong> for <strong>dynamic</strong> and <strong>static large objects</strong> only
              the manifests will be deleted. The related segments will not be deleted.
            </Trans>
          </p>

          {/* Object list preview — capped at first 100 */}
          <div>
            <p className="text-sm font-semibold">
              <Trans>Objects to delete:</Trans>
            </p>
            <div className="bg-theme-background-lvl-2 mt-2 max-h-48 overflow-y-auto rounded p-3">
              <Stack direction="vertical" gap="1">
                {(objects as ObjectSummary[]).map((obj) => (
                  <div key={obj.name} className="text-theme-default overflow-x-hidden text-sm [overflow-wrap:anywhere]">
                    {obj.name}
                  </div>
                ))}
                {container.count > actualObjectCount && (
                  <div className="text-theme-light pt-2 text-sm">
                    {(() => {
                      const shown = actualObjectCount
                      const total = container.count
                      return (
                        <Trans>
                          Showing first {shown} of {total} objects
                        </Trans>
                      )
                    })()}
                  </div>
                )}
              </Stack>
            </div>
          </div>

          <Form
            className="mb-0"
            id="empty-container-form"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FormSection>
              <form.Field
                name="confirm"
                children={(field) => (
                  <TextInput
                    id={field.name}
                    name={field.name}
                    label={t`Type "empty" to confirm`}
                    required
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={emptyContainerMutation.isPending}
                    autoFocus
                    placeholder="empty"
                  />
                )}
              />
            </FormSection>
          </Form>
        </Stack>
      ) : null}
    </Modal>
  )
}
