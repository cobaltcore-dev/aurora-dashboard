import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useEffect, useRef, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { Modal, Stack, Spinner, Checkbox, Form, FormSection, TextInput } from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { ObjectRow } from "./"

export type DeleteObjectVariant = "delete"

interface DeleteObjectModalProps {
  isOpen: boolean
  object: ObjectRow | null
  onClose: () => void
  onSuccess?: (objectName: string) => void
  onError?: (objectName: string, errorMessage: string) => void
}

export const DeleteObjectModal = ({ isOpen, object, onClose, onSuccess, onError }: DeleteObjectModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { containerName } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/",
  })

  const utils = trpcReact.useUtils()

  const formSchema = z.object({
    confirm: z.string().refine((value) => value === "delete", {
      message: t`Type "delete" to confirm`,
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
      if (deleteObjectMutation.isPending || !object) return

      displayNameRef.current = object.displayName
      deleteObjectMutation.mutate({
        project_id: projectId,
        container: containerName,
        object: object.name,
        ...(isSLO && !keepSegments ? { multipartManifest: "delete" as const } : {}),
      })
    },
  })

  const canDelete = useStore(form.store, (state) => state.isSubmitting || state.values.confirm !== "delete")

  // keepSegments is only relevant for SLOs — toggled by a checkbox in the modal.
  const [keepSegments, setKeepSegments] = useState(false)

  // useRef so the object display name survives re-renders triggered by
  // deleteObjectMutation.reset() inside handleClose() before onSuccess/onError fire.
  const displayNameRef = useRef("")

  // ── Metadata fetch ────────────────────────────────────────────────────────
  // Fetch object metadata on open to detect SLO/DLO — determines whether
  // multipartManifest="delete" should be sent in the DELETE request.
  //
  // SLO: X-Static-Large-Object: True  → staticLargeObject === true
  // DLO: X-Object-Manifest: <prefix>  → objectManifest is set
  const {
    data: metadata,
    isLoading: isLoadingMetadata,
    error: metadataError,
  } = trpcReact.storage.swift.getObjectMetadata.useQuery(
    { project_id: projectId, container: containerName, object: object?.name ?? "" },
    { enabled: isOpen && object !== null }
  )

  const isSLO = metadata?.staticLargeObject === true
  const isDLO = !!metadata?.objectManifest

  const deleteObjectMutation = trpcReact.storage.swift.deleteObject.useMutation({
    onSuccess: () => {
      utils.storage.swift.listObjects.invalidate({ project_id: projectId, container: containerName })
      onSuccess?.(displayNameRef.current)
    },
    onError: (error) => {
      onError?.(displayNameRef.current, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  useEffect(() => {
    if (!isOpen) {
      deleteObjectMutation.reset()
      setKeepSegments(false)
      form.reset()
    }
  }, [isOpen])

  const handleClose = () => {
    deleteObjectMutation.reset()
    onClose()
  }

  if (!isOpen || !object) return null

  const displayName = object.displayName
  const isLoading = isLoadingMetadata
  const isPending = deleteObjectMutation.isPending
  const metadataErrorMessage = metadataError?.message ?? ""

  return (
    <Modal
      title={
        <span className="flex max-w-100 items-center gap-1">
          <span className="shrink-0">
            <Trans>Delete object:</Trans>
          </span>
          <span className="truncate" title={displayName}>
            {displayName}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Deleting...` : t`Delete Object`}
      confirmButtonVariant="primary-danger"
      onConfirm={form.handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isLoading || isPending || !!metadataError || canDelete}
    >
      {metadataError && (
        <p className="text-theme-error mb-4">
          <Trans>Failed to load object metadata: {metadataErrorMessage}</Trans>
        </p>
      )}
      {isPending ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Deleting...</Trans>
        </Stack>
      ) : isLoading ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Loading object info...</Trans>
        </Stack>
      ) : !metadataError ? (
        <Stack direction="vertical" gap="4">
          <p className="text-theme-default">
            <Trans>
              Object <span className="font-semibold">"{displayName}"</span> will be permanently deleted. This cannot be
              undone.
            </Trans>
          </p>
          {isSLO && (
            <>
              <p className="text-theme-default">
                <Trans>
                  This is a <strong>static large object</strong>. By default, all associated segment objects will also
                  be permanently deleted.
                </Trans>
              </p>
              <Checkbox
                label={t`Keep segments (delete manifest only)`}
                checked={keepSegments}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeepSegments(e.target.checked)}
              />
            </>
          )}
          {isDLO && (
            <p className="text-theme-default">
              <Trans>
                This is a <strong>dynamic large object</strong>. Only the manifest will be deleted — its segment objects
                (stored under the manifest prefix) are <strong>not</strong> automatically removed and must be deleted
                separately.
              </Trans>
            </p>
          )}
          <Form
            className="mb-0"
            id="delete-object-form"
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
                    label={t`Type "delete" to confirm`}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="delete"
                    autoFocus
                    disabled={isPending}
                    required
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
