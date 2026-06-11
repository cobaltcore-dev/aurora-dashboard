import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, TextInput, Message } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"

export interface CreateCaModalProps {
  open: boolean
  onClose: () => void
}

const csrRegex = /^(?=.{1,253}$)(?:\*\.)?(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/
const isValidCommonName = (value: string) => csrRegex.test(value)

export const CreatePcaModal = ({ open, onClose }: CreateCaModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { isPending, ...createPcaMutation } = trpcReact.services.pca.create.useMutation({
    onSettled: () => utils.services.pca.list.invalidate(),
  })

  const formSchema = z.object({
    common_name: z
      .string()
      .trim()
      .min(1, t`Common name is required.`)
      .refine((value) => isValidCommonName(value), { message: t`Must be a valid common name (FQDN).` }),
  })

  const form = useForm({
    defaultValues: {
      common_name: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (isPending) return

      await createPcaMutation.mutateAsync({
        project_id: projectId,
        configuration: {
          subject: { common_name: value.common_name },
        },
      })
      handleClose()
    },
  })

  const handleClose = () => {
    if (isPending) return

    form.reset()
    createPcaMutation.reset()
    onClose()
  }

  // Reactive subscription used to control create action disabled state.
  const isCreateDisabled = useStore(
    form.store,
    (state) => state.isSubmitting || state.values.common_name.trim().length === 0
  )

  return (
    <Modal
      open={open}
      size="large"
      title={t`Create Certificate Authority`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Save`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isPending || isCreateDisabled}
    >
      {createPcaMutation.error?.message && (
        <Message dismissible={false} variant="error" className="mb-4">
          {createPcaMutation.error.message}
        </Message>
      )}

      {isPending && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-theme-high text-sm">
            <Trans>Creating Certificate Authority...</Trans>
          </span>
        </div>
      )}

      {!isPending && (
        <Form
          className="mb-0"
          id="create-certificate-authority-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection className="mb-4">
            <form.Field
              name="common_name"
              children={(field) => (
                <TextInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  label={t`Common name`}
                  placeholder={t`Enter Common name (e.g., demo-ca.test.sci)`}
                  helptext={t`Enter a valid common name in FQDN format (e.g., demo-ca.test.sci).`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isPending}
                />
              )}
            />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
