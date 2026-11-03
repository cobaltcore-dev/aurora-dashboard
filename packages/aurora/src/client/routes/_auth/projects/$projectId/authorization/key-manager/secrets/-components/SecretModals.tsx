import { useState } from "react"
import {
  Modal,
  Form,
  FormSection,
  FormRow,
  TextInput,
  Textarea,
  Select,
  SelectOption,
  DateTimePicker,
  Message,
  Stack,
  Button,
  toast,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { useQueryClient } from "@tanstack/react-query"
import { trpcReact } from "@/client/trpcClient"
import { uuidFromRef } from "../../-components/keyManagerUtils"
import { getSecretCreatedToast, getSecretDeletedToast } from "../../-components/KeyManagerToastNotifications"
import type { Secret } from "@/server/KeyManager/types/keyManager"

// Barbican secret types. Order mirrors the old keymanagerng plugin (alphabetical).
const SECRET_TYPES = ["certificate", "opaque", "passphrase", "private", "public", "symmetric"] as const

// Content types that must be base64-encoded.
const BASE64_CONTENT_TYPES = ["application/pkcs8", "application/octet-stream", "application/pkix-cert"]

// Allowed payload content types per secret type (mirrors Barbican + the old plugin).
const CONTENT_TYPES_BY_SECRET_TYPE: Record<string, string[]> = {
  symmetric: ["application/octet-stream"],
  public: ["text/plain", "application/octet-stream"],
  private: ["text/plain", "application/octet-stream"],
  passphrase: ["text/plain", "text/plain;charset=utf-8"],
  certificate: ["text/plain", "application/pkcs8", "application/pkix-cert"],
  opaque: ["text/plain", "application/octet-stream"],
}

interface SecretValidation {
  name?: string
  secret_type?: string
  payload?: string
  payload_content_type?: string
  expiration?: string
}

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
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [secretType, setSecretType] = useState("")
  const [payload, setPayload] = useState("")
  const [payloadContentType, setPayloadContentType] = useState("")
  const [expiration, setExpiration] = useState("")
  const [bitLength, setBitLength] = useState("")
  const [algorithm, setAlgorithm] = useState("")
  const [mode, setMode] = useState("")
  const [showTypeHelp, setShowTypeHelp] = useState(false)
  const [validation, setValidation] = useState<SecretValidation>({})

  const createMutation = trpcReact.keyManager.createSecret.useMutation({
    onSuccess: () => {
      const { message, ...options } = getSecretCreatedToast(name.trim())
      toast.success(message, options)
      void queryClient.invalidateQueries({ queryKey: ["km-all-secrets", projectId] })
      onSuccess()
      onClose()
    },
  })

  const contentTypeOptions = secretType ? (CONTENT_TYPES_BY_SECRET_TYPE[secretType] ?? []) : []
  const needsBase64 = BASE64_CONTENT_TYPES.includes(payloadContentType)

  const handleSecretTypeChange = (value: string) => {
    setSecretType(value)
    // Content type options depend on the secret type — reset the selection.
    setPayloadContentType("")
    setValidation((prev) => ({ ...prev, secret_type: undefined }))
  }

  const validate = (): SecretValidation => {
    const errors: SecretValidation = {}
    if (!name.trim()) errors.name = t`Name is required`
    if (!secretType) errors.secret_type = t`Secret type is required`
    if (!payload.trim()) errors.payload = t`Payload is required`
    if (!payloadContentType) errors.payload_content_type = t`Payload content type is required`
    if (expiration && new Date(expiration) <= new Date()) {
      errors.expiration = t`Expiration must be in the future`
    }
    return errors
  }

  const handleConfirm = () => {
    const errors = validate()
    setValidation(errors)
    if (Object.keys(errors).length > 0) return
    const parsedBitLength = bitLength ? Number(bitLength) : undefined
    createMutation.mutate({
      project_id: projectId,
      name: name.trim(),
      secret_type: secretType,
      payload: payload,
      payload_content_type: payloadContentType,
      payload_content_encoding: needsBase64 ? "base64" : undefined,
      expiration: expiration || undefined,
      bit_length: parsedBitLength && parsedBitLength > 0 ? parsedBitLength : undefined,
      algorithm: algorithm.trim() || undefined,
      mode: mode.trim() || undefined,
    })
  }

  return (
    <Modal
      open
      size="large"
      title={t`Create Secret`}
      onCancel={onClose}
      onConfirm={handleConfirm}
      confirmButtonLabel={t`Create`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={createMutation.isPending}
      disableCancelButton={createMutation.isPending}
      disableCloseButton={createMutation.isPending}
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
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              invalid={Boolean(validation.name)}
              errortext={validation.name}
            />
          </FormRow>
          <FormRow>
            <DateTimePicker
              id="expiration"
              label={t`Expiration`}
              enableTime
              minDate="today"
              value={expiration || undefined}
              onChange={(dates) => {
                const picked = dates?.[0]
                setExpiration(picked ? picked.toISOString() : "")
                setValidation((prev) => ({ ...prev, expiration: undefined }))
              }}
              invalid={Boolean(validation.expiration)}
              errortext={validation.expiration}
              helptext={t`Optional. If set, the secret will not be available after this UTC timestamp.`}
            />
          </FormRow>
          <FormRow>
            <TextInput
              id="bit-length"
              type="number"
              label={t`Bit Length`}
              value={bitLength}
              onChange={(e) => setBitLength(e.target.value)}
              helptext={t`Metadata for informational purposes. Value must be greater than zero.`}
            />
          </FormRow>
          <FormRow>
            <TextInput
              id="algorithm"
              label={t`Algorithm`}
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              helptext={t`Metadata for informational purposes.`}
            />
          </FormRow>
          <FormRow>
            <TextInput
              id="mode"
              label={t`Mode`}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              helptext={t`Metadata for informational purposes.`}
            />
          </FormRow>
          <FormRow>
            <Select
              id="secret-type"
              label={t`Secret Type`}
              required
              value={secretType}
              placeholder={t`Select...`}
              onChange={(v) => handleSecretTypeChange(typeof v === "string" ? v : "")}
              invalid={Boolean(validation.secret_type)}
              errortext={validation.secret_type}
            >
              {SECRET_TYPES.map((type) => (
                <SelectOption key={type} value={type} label={type} />
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <SecretTypeHelp show={showTypeHelp} onToggle={setShowTypeHelp} />
          </FormRow>
          <FormRow>
            <Textarea
              id="payload"
              label={t`Payload`}
              required
              rows={6}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              invalid={Boolean(validation.payload)}
              errortext={validation.payload}
              helptext={validation.payload ? undefined : t`The secret's data to be stored.`}
            />
          </FormRow>
          <FormRow>
            <Select
              id="payload-content-type"
              label={t`Payload Content Type`}
              required
              value={payloadContentType}
              placeholder={secretType ? t`Select...` : t`Select a secret type first`}
              disabled={!secretType}
              onChange={(v) => {
                setPayloadContentType(typeof v === "string" ? v : "")
                setValidation((prev) => ({ ...prev, payload_content_type: undefined }))
              }}
              invalid={Boolean(validation.payload_content_type)}
              errortext={validation.payload_content_type}
            >
              {contentTypeOptions.map((ct) => (
                <SelectOption key={ct} value={ct} label={ct} />
              ))}
            </Select>
          </FormRow>
          {needsBase64 && (
            <>
              <FormRow>
                <Message variant="info" text={t`Encode the payload according to the content encoding below.`} />
              </FormRow>
              <FormRow>
                <TextInput
                  id="payload-content-encoding"
                  label={t`Payload Content Encoding`}
                  value="base64"
                  disabled
                  helptext={t`The encoding used for the payload. Currently only base64 is supported.`}
                />
              </FormRow>
            </>
          )}
        </FormSection>
      </Form>
    </Modal>
  )
}

function SecretTypeHelp({ show, onToggle }: { show: boolean; onToggle: (value: boolean) => void }) {
  const { t } = useLingui()
  return (
    <Stack direction="vertical" gap="1" className="text-theme-light text-sm">
      {show && (
        <>
          <p>{t`certificate — Used for storing cryptographic certificates such as X.509 certificates`}</p>
          <p>{t`opaque — Used for backwards compatibility with previous versions of the API without typed secrets`}</p>
          <p>{t`passphrase — Used for storing plain text passphrases`}</p>
          <p>{t`private — Used for storing the private key of an asymmetric keypair`}</p>
          <p>{t`public — Used for storing the public key of an asymmetric keypair`}</p>
          <p>{t`symmetric — Used for storing byte arrays such as keys suitable for symmetric encryption`}</p>
        </>
      )}
      <Button
        variant="subdued"
        size="small"
        icon={show ? "chevronLeft" : "chevronRight"}
        onClick={() => onToggle(!show)}
        label={show ? t`Hide info about secret types` : t`Show more info about secret types`}
        className="jn:self-start jn:!px-0"
      />
    </Stack>
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
  const queryClient = useQueryClient()
  const secretId = uuidFromRef(secret.secret_ref)
  const secretName = secret.name ?? secretId
  const utils = trpcReact.useUtils()
  const deleteMutation = trpcReact.keyManager.deleteSecret.useMutation({
    onSuccess: () => {
      const { message, ...options } = getSecretDeletedToast(secretName)
      toast.success(message, options)
      void utils.keyManager.listSecrets.invalidate()
      void queryClient.invalidateQueries({ queryKey: ["km-all-secrets", projectId] })
      onClose()
    },
  })

  return (
    <Modal
      open
      size="small"
      title={t`Delete Secret`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, secretId })}
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={deleteMutation.isPending}
      disableCancelButton={deleteMutation.isPending}
      disableCloseButton={deleteMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        {deleteMutation.error && <Message variant="error" text={deleteMutation.error.message} />}
        <p className="text-theme-default">{t`The secret "${secretName}" will be permanently deleted. This action cannot be undone.`}</p>
      </Stack>
    </Modal>
  )
}
