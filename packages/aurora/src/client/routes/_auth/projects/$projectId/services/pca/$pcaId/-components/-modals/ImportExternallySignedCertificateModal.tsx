import { useRef, useState } from "react"
import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, Message, Textarea, Button, toast } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import { getCertificateImportedToast } from "../../../-components/PcaToastNotifications"
import { ParsedCertificateInfo } from "./ParsedCertificateInfo"
import { isValidCertificateChain } from "./parseCsrInfo"

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
  const [fileError, setFileError] = useState<string | null>(null)

  const formSchema = z.object({
    imported_certificate_chain: z
      .string()
      .trim()
      .min(1)
      .refine(isValidCertificateChain, t`The imported certificate chain is not valid PEM.`),
  })

  const { isPending, ...importMutation } = trpcReact.services.pca.import.useMutation({
    onSettled: () => utils.services.pca.getById.invalidate(),
  })

  const form = useForm({
    defaultValues: {
      imported_certificate_chain: "",
    },
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      await importMutation.mutateAsync({
        project_id: projectId,
        certificate_authority_id: pcaId,
        imported_certificate_chain: value.imported_certificate_chain,
      })

      const { message, ...options } = getCertificateImportedToast()
      toast.success(message, options)

      handleClose()
    },
  })

  const handleClose = () => {
    if (isPending) return

    form.reset()
    setFileError(null)
    importMutation.reset()
    onClose()
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentChain = useStore(form.store, (state) => state.values.imported_certificate_chain)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(null)
    if (!file.name.toLowerCase().endsWith(".json")) {
      setFileError(t`Only JSON certificate files are supported.`)
      e.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      try {
        const parsed = JSON.parse(text)
        if (typeof parsed?.imported_certificate_chain !== "string") {
          throw new Error(t`The JSON file must contain imported_certificate_chain.`)
        }

        const chainValue = parsed.imported_certificate_chain
        form.setFieldValue("imported_certificate_chain", chainValue)
        if (fileInputRef.current) fileInputRef.current.value = ""
      } catch (error) {
        setFileError(error instanceof Error ? error.message : t`The certificate file could not be read.`)
        form.setFieldValue("imported_certificate_chain", "")
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
      disableConfirmButton={isPending || !currentChain.trim() || !form.state.canSubmit}
    >
      {importMutation.error && (
        <Message dismissible={false} variant="error" className="mb-4">
          {importMutation.error.message}
        </Message>
      )}

      {fileError && (
        <Message dismissible={false} variant="error" className="mb-4">
          {fileError}
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
              <input ref={fileInputRef} type="file" accept=".json" className="sr-only" onChange={handleFileChange} />
            </div>
            <form.Field
              name="imported_certificate_chain"
              children={(field) => (
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    const value = e.target.value
                    field.handleChange(value)
                    setFileError(null)
                  }}
                  placeholder={t`Paste the code`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isPending}
                />
              )}
            />
            <ParsedCertificateInfo csrCode={currentChain} />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
