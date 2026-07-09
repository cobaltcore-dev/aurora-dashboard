import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, Message, Textarea } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import { ParsedCertificateInfo } from "./ParsedCertificateInfo"

export interface IssueEndEntityCertificateModalProps {
  open: boolean
  onClose: () => void
  pcaId: string
}

export const IssueEndEntityCertificateModal = ({ open, onClose, pcaId }: IssueEndEntityCertificateModalProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { isPending, ...createCertificateMutation } = trpcReact.services.pca.createCertificate.useMutation({
    onSettled: () => utils.services.pca.listCertificates.invalidate(),
  })

  const formSchema = z.object({
    csr: z.string().trim().min(1),
  })

  const form = useForm({
    defaultValues: {
      csr: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (isPending) return

      const createdCertificate = await createCertificateMutation.mutateAsync({
        project_id: projectId,
        certificate_authority_id: pcaId,
        // Normalize to one format so users can paste raw multi-line CSRs with \n along with already formatted ones
        csr: value.csr.replace(/\\n/g, "\n"),
        configuration: { validity: { not_after: Math.floor(Date.now() / 1000) + 8 * 60 * 60 } },
      })
      handleClose()

      await navigate({
        to: "/projects/$projectId/services/pca/$pcaId/$certificateId",
        params: { projectId, pcaId, certificateId: createdCertificate.id },
      })
    },
  })

  const handleClose = () => {
    if (isPending) return

    form.reset()
    createCertificateMutation.reset()
    onClose()
  }

  const currentCsr = useStore(form.store, (state) => state.values.csr)

  return (
    <Modal
      open={open}
      size="large"
      title={t`Issue End-Entity Certificate`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Save`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isPending || !(currentCsr.trim().length > 0)}
    >
      {createCertificateMutation.error && (
        <Message dismissible={false} variant="error" className="mb-4">
          {createCertificateMutation.error?.message}
        </Message>
      )}

      {isPending && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-theme-high text-sm">
            <Trans>Issuing End-Entity Certificate...</Trans>
          </span>
        </div>
      )}

      {!isPending && (
        <Form
          className="mb-0"
          id="issue-end-entity-certificate-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection>
            <form.Field
              name="csr"
              children={(field) => (
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t`Paste CSR code`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isPending}
                />
              )}
            />
            <ParsedCertificateInfo csrCode={currentCsr} />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
