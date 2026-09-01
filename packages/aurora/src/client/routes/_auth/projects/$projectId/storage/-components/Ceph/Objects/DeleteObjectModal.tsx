import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormSection,
  TextInput,
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { formatBytesBinary } from "@/client/utils/formatBytes"

interface DeleteObjectModalProps {
  bucketName: string
  objectKey: string
  objectSize?: number
  lastModified?: string
  isOpen: boolean
  versioningEnabled?: boolean
  onClose: () => void
  onSuccess: (objectKey: string) => void
  onError: (objectKey: string, errorMessage: string) => void
}

export function DeleteObjectModal({
  bucketName,
  objectKey,
  objectSize,
  lastModified,
  isOpen,
  versioningEnabled = false,
  onClose,
  onSuccess,
  onError,
}: DeleteObjectModalProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.object.delete",
  })

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
      if (deleteMutation.isPending || !projectId) return

      markSubmitted()
      deleteMutation.mutate({
        project_id: projectId,
        containerName: bucketName,
        objectKey,
      })
    },
  })

  const canDelete = useStore(form.store, (state) => state.isSubmitting || state.values.confirm !== "delete")

  const deleteMutation = trpcReact.storage.ceph.objects.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.objects.list.invalidate()
      utils.storage.ceph.containers.list.invalidate()

      utils.storage.ceph.versioning.checkDeletedContent.invalidate()
      onSuccess(objectKey)
      handleClose()
    },
    onError: (error) => {
      onError(objectKey, error.message)
    },
  })

  const handleClose = () => {
    trackClose()
    form.reset()
    deleteMutation.reset()
    resetTracking()
    onClose()
  }

  const isFolder = objectKey.endsWith("/")
  const displayName = objectKey.split("/").filter(Boolean).pop() || objectKey

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={isFolder ? <Trans>Delete Folder "{displayName}"</Trans> : <Trans>Delete Object</Trans>}
      size="large"
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : isFolder ? t`Delete Folder` : t`Delete Object`}
      confirmButtonVariant="primary-danger"
      onConfirm={form.handleSubmit}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={canDelete || deleteMutation.isPending}
      disableCancelButton={deleteMutation.isPending}
      disableCloseButton={deleteMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        <p className="text-theme-default overflow-x-hidden [overflow-wrap:anywhere]">
          {isFolder ? (
            versioningEnabled ? (
              <Trans>
                Confirm deletion of {displayName}. All objects inside this folder will be marked as deleted but can be
                restored from version history.
              </Trans>
            ) : (
              <Trans>
                Confirm deletion of {displayName}. All objects inside this folder will be permanently deleted. This
                action cannot be undone.
              </Trans>
            )
          ) : versioningEnabled ? (
            <Trans>
              Confirm deletion of {displayName}. The object will be marked as deleted but can be restored from version
              history.
            </Trans>
          ) : (
            <Trans>
              Confirm deletion of {displayName}. The object will be permanently deleted. This action cannot be undone.
            </Trans>
          )}
        </p>

        {!isFolder ? (
          <DescriptionList>
            <DescriptionTerm>
              <Trans>Name</Trans>
            </DescriptionTerm>
            <DescriptionDefinition className="overflow-x-hidden [overflow-wrap:anywhere]">
              {displayName}
            </DescriptionDefinition>

            <DescriptionTerm>
              <Trans>Size</Trans>
            </DescriptionTerm>
            <DescriptionDefinition>
              {objectSize !== undefined ? formatBytesBinary(objectSize) : "-"}
            </DescriptionDefinition>

            <DescriptionTerm>
              <Trans>Last Modified</Trans>
            </DescriptionTerm>
            <DescriptionDefinition>
              {lastModified ? new Date(lastModified).toLocaleString() : "-"}
            </DescriptionDefinition>

            <DescriptionTerm>
              <Trans>Full Path</Trans>
            </DescriptionTerm>
            <DescriptionDefinition className="overflow-x-hidden [overflow-wrap:anywhere]">
              {objectKey}
            </DescriptionDefinition>
          </DescriptionList>
        ) : (
          <DescriptionList>
            <DescriptionTerm>
              <Trans>Name</Trans>
            </DescriptionTerm>
            <DescriptionDefinition className="overflow-x-hidden [overflow-wrap:anywhere]">
              {displayName}
            </DescriptionDefinition>

            <DescriptionTerm>
              <Trans>Full Path</Trans>
            </DescriptionTerm>
            <DescriptionDefinition className="overflow-x-hidden [overflow-wrap:anywhere]">
              {objectKey}
            </DescriptionDefinition>
          </DescriptionList>
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
                  disabled={deleteMutation.isPending}
                  required
                />
              )}
            />
          </FormSection>
        </Form>

        {deleteMutation.error && (
          <p className="text-juno-red text-sm">
            <Trans>Error:</Trans> {deleteMutation.error.message}
          </p>
        )}
      </Stack>
    </Modal>
  )
}
