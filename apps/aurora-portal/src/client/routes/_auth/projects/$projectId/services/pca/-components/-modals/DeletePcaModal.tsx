import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, Message, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import type { CertificateAuthority } from "@/server/Services/types/pca"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"

export interface DeletePcaModalProps {
  pca: CertificateAuthority
  open: boolean
  onClose: () => void
}

export const DeletePcaModal = ({ pca, open, onClose }: DeletePcaModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { isPending, ...deletePcaMutation } = trpcReact.services.pca.delete.useMutation({
    onSettled: () => utils.services.pca.list.invalidate(),
  })

  const formSchema = z.object({
    delete: z.string().refine((value) => value === "delete", {
      message: t`Type “delete” to confirm`,
    }),
  })

  const form = useForm({
    defaultValues: {
      delete: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      if (isPending) return

      await deletePcaMutation.mutateAsync({
        project_id: projectId,
        certificate_authority_id: pca.id,
      })
      handleClose()
    },
  })

  // creates a reactive subscription so the component re-renders, which allows the confirm button to enable once the user types "delete".
  const canDelete = useStore(form.store, (state) => state.isSubmitting || state.values.delete !== "delete")

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      size="large"
      title={t`Delete certificate authority`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Delete`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isPending || canDelete}
    >
      {deletePcaMutation.error?.message && (
        <Message dismissible={false} variant="error" className="mb-4">
          {deletePcaMutation.error.message}
        </Message>
      )}

      {isPending && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-theme-high text-sm">
            <Trans>Deleting certificate authority...</Trans>
          </span>
        </div>
      )}

      <Stack gap="2.5" direction="vertical" className="mb-2.5">
        <p>
          <Trans>
            Deleting this Certificate Authority is permanent, and all the associated certificates will no longer apply
            to entities.
          </Trans>
        </p>
        <p>
          <Trans>
            To confirm, type <strong>"delete"</strong> in the field below.
          </Trans>
        </p>
      </Stack>

      {!isPending && (
        <Form
          className="mb-0"
          id="delete-pca-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection>
            <form.Field
              name="delete"
              children={(field) => (
                <TextInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t`Type "delete" to confirm`}
                  helptext={t`The text must match “delete” in lowercase.`}
                  required
                />
              )}
            />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
