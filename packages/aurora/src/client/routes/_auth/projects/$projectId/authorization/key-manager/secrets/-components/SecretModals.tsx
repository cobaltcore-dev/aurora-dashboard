import {
  Modal,
  Form,
  FormSection,
  FormRow,
  TextInput,
  Textarea,
  Select,
  SelectOption,
  Message,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { uuidFromRef } from "../../-components/utils"
import type { Secret } from "@/server/KeyManager/types/keyManager"

const SECRET_TYPES = ["opaque", "symmetric", "public", "private", "passphrase", "certificate"]

export function CreateSecretModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useLingui()
  const [name, setName] = useState("")
  const [secretType, setSecretType] = useState("opaque")
  const [payload, setPayload] = useState("")

  const createMutation = trpcReact.keyManager.createSecret.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  return (
    <Modal
      open
      size="large"
      title={t`Create Secret`}
      onCancel={onClose}
      onConfirm={() =>
        createMutation.mutate({
          project_id: projectId,
          name: name || undefined,
          secret_type: secretType,
          payload: payload || undefined,
          payload_content_type: payload ? "text/plain" : undefined,
        })
      }
      confirmButtonLabel={t`Create`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={createMutation.isPending}
      disableCancelButton={createMutation.isPending}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        {createMutation.error && (
          <FormRow>
            <Message variant="error" text={createMutation.error.message} />
          </FormRow>
        )}
        <FormSection>
          <FormRow>
            <TextInput
              id="name"
              label={t`Name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              helptext={t`Optional. A friendly name for the secret.`}
            />
          </FormRow>
          <FormRow>
            <Select id="secret-type" label={t`Type`} value={secretType} onChange={(v) => setSecretType(String(v))}>
              {SECRET_TYPES.map((type) => (
                <SelectOption key={type} value={type} label={type} />
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Textarea
              id="payload"
              label={t`Payload`}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={4}
              helptext={t`Optional. The secret material to store.`}
            />
          </FormRow>
        </FormSection>
      </Form>
    </Modal>
  )
}

export function DeleteSecretModal({
  projectId,
  secret,
  onClose,
}: {
  projectId: string
  secret: Secret
  onClose: () => void
}) {
  const { t } = useLingui()
  const secretId = uuidFromRef(secret.secret_ref)
  const secretName = secret.name ?? secretId
  const utils = trpcReact.useUtils()
  const deleteMutation = trpcReact.keyManager.deleteSecret.useMutation({
    onSuccess: () => {
      void utils.keyManager.listSecrets.invalidate()
      onClose()
    },
  })

  return (
    <Modal
      open
      size="small"
      title={t`Delete Secret "${secretName}"`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, secretId })}
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={deleteMutation.isPending}
      disableCancelButton={deleteMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        {deleteMutation.error && <Message variant="error" text={deleteMutation.error.message} />}
        <p className="text-theme-default">{t`This action cannot be undone. The secret will be permanently deleted.`}</p>
      </Stack>
    </Modal>
  )
}
