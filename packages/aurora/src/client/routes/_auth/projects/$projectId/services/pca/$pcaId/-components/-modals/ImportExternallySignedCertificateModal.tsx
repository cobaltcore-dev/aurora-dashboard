import { useRef } from "react"
import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, Message, Textarea, Button } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"

export interface ImportExternallySignedCertificateModalProps {
  open: boolean
  onClose: () => void
  pcaId: string
}

export const ImportExternallySignedCertificateModal = ({
  open,
  onClose,
  pcaId,
}: ImportExternallySignedCertificateModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { isPending, ...importMutation } = trpcReact.services.pca.import.useMutation({
    onSettled: () => utils.services.pca.getById.invalidate(),
  })

  const formSchema = z.object({
    imported_certificate_chain: z.string().trim().min(1),
  })

  const form = useForm({
    defaultValues: {
      imported_certificate_chain: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      if (isPending) return

      await importMutation.mutateAsync({
        project_id: projectId,
        certificate_authority_id: pcaId,
        imported_certificate_chain: form.state.values.imported_certificate_chain,
      })
      handleClose()
    },
  })

  const handleClose = () => {
    if (isPending) return

    form.reset()
    importMutation.reset()
    onClose()
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentChain = useStore(form.store, (state) => state.values.imported_certificate_chain)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text)
        form.setFieldValue("imported_certificate_chain", parsed.imported_certificate_chain ?? text)
      } else {
        form.setFieldValue("imported_certificate_chain", text)
      }
    }
    reader.readAsText(file)
  }

  return (
    <Modal
      open={open}
      size="large"
      title={t`Import Externally Signed Certificate`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Save`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isPending || !currentChain.trim()}
    >
      {importMutation.error && (
        <Message dismissible={false} variant="error" className="mb-4">
          {importMutation.error?.message}
        </Message>
      )}

      {isPending && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-theme-high text-sm">
            <Trans>Importing Certificate...</Trans>
          </span>
        </div>
      )}

      {!isPending && (
        <Form
          className="mb-0"
          id="import-externally-signed-certificate-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection>
            <div className="mb-2">
              <Button onClick={() => fileInputRef.current?.click()}>{t`Choose Certificate to Import`}</Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pem,.crt,.cer,.json"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
            <form.Field
              name="imported_certificate_chain"
              children={(field) => (
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t`Paste the code`}
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
