import { z } from "zod"
import { useForm } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, TextInput } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
// import { useProjectId } from "@/client/hooks"

export interface CreateCaModalProps {
  open: boolean
  onClose: () => void
}

const csrRegex = /^(?=.{1,253}$)(?:\*\.)?(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/
const isValidCommonName = (value: string) => csrRegex.test(value)

export const CreateCaModal = ({ open, onClose }: CreateCaModalProps) => {
  const { t } = useLingui()
  // const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { isPending, ...createCaMutation } = trpcReact.services.pca.create.useMutation({
    onSettled: () => utils.services.pca.list.invalidate(),
  })

  const formSchema = z.object({
    common_name: z
      .string()
      .trim()
      // .max(63, t`DNS name must be at most 63 characters.`)
      .refine((value) => value === "" || isValidCommonName(value), {
        message: t`Must be a valid CSR name.`,
      }),
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

      await createCaMutation.mutateAsync({
        ...(value.common_name && { common_name: value.common_name }),
        project_id: "",
      })
      handleClose()
    },
  })

  const handleClose = () => {
    if (isPending) return

    form.reset()
    createCaMutation.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      size="large"
      title={t`Create Certificate Authority`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Create`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isPending}
    >
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
                  label={t`Common Name`}
                  placeholder={t`Enter Common Name (e.g., example.com)`}
                  helptext={t`Enter a valid CSR name.`}
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
