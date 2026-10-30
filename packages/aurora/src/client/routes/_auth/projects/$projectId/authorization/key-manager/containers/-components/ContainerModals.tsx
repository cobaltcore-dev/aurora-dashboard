import { useState } from "react"
import {
  Button,
  Modal,
  Form,
  FormSection,
  FormRow,
  TextInput,
  Select,
  SelectOption,
  Message,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { uuidFromRef } from "../../-components/utils"
import type { Container } from "@/server/KeyManager/types/keyManager"

const CONTAINER_TYPES: Container["type"][] = ["generic", "rsa", "certificate"]

// RSA field names (used as secret_ref names in the Barbican API)
const RSA_FIELD_NAMES = ["private_key", "private_key_passphrase", "public_key"] as const
// Certificate field names
const CERTIFICATE_FIELD_NAMES = ["certificate", "private_key", "private_key_passphrase", "intermediates"] as const

export function CreateContainerModal({
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
  const [type, setType] = useState<Container["type"]>("generic")
  // RSA / Certificate: maps field name → selected secret_ref URI
  const [namedRefs, setNamedRefs] = useState<Record<string, string>>({})
  // Generic: list of { name, secret_ref } pairs the user has added
  const [genericRefs, setGenericRefs] = useState<Array<{ name: string; secret_ref: string }>>([])
  // Pending inputs for the generic "add a secret ref" row
  const [pendingRefName, setPendingRefName] = useState("")
  const [pendingRefSecret, setPendingRefSecret] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  // Load secrets so the dropdowns can be populated
  const { data: secretsData, isError: secretsQueryError } = trpcReact.keyManager.listSecrets.useQuery(
    { project_id: projectId, offset: 0, limit: 100 },
    { retry: false }
  )
  const secrets = secretsQueryError ? [] : (secretsData?.secrets ?? [])

  // Translated type descriptions — defined inside component so t`` is in scope
  const typeDescriptions: Record<Container["type"], string> = {
    rsa: t`An RSA container is used for storing RSA public keys, private keys, and private key pass phrases`,
    certificate: t`A certificate container is used for storing the following secrets that are relevant to certificates: certificate, private_key (optional), private_key_passphrase (optional), intermediates (optional)`,
    generic: t`A generic container is used for any type of container that a user may wish to create. There are no restrictions on the type or amount of secrets that can be held within a container`,
  }

  // Field definitions with translated labels (inside component to use t)
  const rsaFields = [
    { name: "private_key", label: t`Private Key`, required: true },
    { name: "private_key_passphrase", label: t`Private Key Passphrase`, required: false },
    { name: "public_key", label: t`Public Key`, required: true },
  ]
  const certificateFields = [
    { name: "certificate", label: t`Certificate`, required: true },
    { name: "private_key", label: t`Private Key`, required: false },
    { name: "private_key_passphrase", label: t`Private Key Passphrase`, required: false },
    { name: "intermediates", label: t`Intermediates`, required: false },
  ]
  const currentFields = type === "rsa" ? rsaFields : type === "certificate" ? certificateFields : null

  const createMutation = trpcReact.keyManager.createContainer.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  const handleTypeChange = (newType: string) => {
    setType(newType as Container["type"])
    setNamedRefs({})
    setGenericRefs([])
    setPendingRefName("")
    setPendingRefSecret("")
    setValidationError(null)
  }

  const buildSecretRefs = (): Array<{ name: string; secret_ref: string }> => {
    if (type === "generic") return genericRefs
    const fields = currentFields ?? []
    return fields.filter((f) => namedRefs[f.name]).map((f) => ({ name: f.name, secret_ref: namedRefs[f.name] }))
  }

  const validate = (): string | null => {
    if (type === "rsa") {
      if (!namedRefs[RSA_FIELD_NAMES[0]]) return t`Private Key is required for RSA containers`
      if (!namedRefs[RSA_FIELD_NAMES[2]]) return t`Public Key is required for RSA containers`
    } else if (type === "certificate") {
      if (!namedRefs[CERTIFICATE_FIELD_NAMES[0]]) return t`Certificate is required for certificate containers`
    }
    return null
  }

  const handleConfirm = () => {
    const error = validate()
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)
    createMutation.mutate({
      project_id: projectId,
      name: name || undefined,
      type,
      secret_refs: buildSecretRefs(),
    })
  }

  const handleAddGenericRef = () => {
    if (!pendingRefName.trim() || !pendingRefSecret) return
    setGenericRefs((prev) => [...prev, { name: pendingRefName.trim(), secret_ref: pendingRefSecret }])
    setPendingRefName("")
    setPendingRefSecret("")
  }

  const errorMessage = validationError ?? createMutation.error?.message ?? null

  return (
    <Modal
      open
      size="large"
      title={t`Create Container`}
      onCancel={onClose}
      onConfirm={handleConfirm}
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
        {errorMessage && (
          <FormRow>
            <Message variant="error" text={errorMessage} />
          </FormRow>
        )}
        <FormSection>
          <FormRow>
            <TextInput
              id="name"
              label={t`Name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              helptext={t`Optional. A friendly name for the container.`}
            />
          </FormRow>
          <FormRow>
            <Select
              id="container-type"
              label={t`Type`}
              value={type}
              onChange={(v) => handleTypeChange(typeof v === "string" ? v : "generic")}
            >
              {CONTAINER_TYPES.map((containerType) => (
                <SelectOption key={containerType} value={containerType} label={containerType} />
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <p className="text-sm">{typeDescriptions[type]}</p>
          </FormRow>
        </FormSection>

        {/* RSA / Certificate: fixed named secret fields */}
        {currentFields && (
          <FormSection>
            {currentFields.map((field) => (
              <FormRow key={field.name}>
                <Select
                  id={`secret-${field.name}`}
                  label={field.required ? field.label : `${field.label} (${t`optional`})`}
                  value={namedRefs[field.name] ?? ""}
                  onChange={(v) => {
                    setNamedRefs((prev) => ({
                      ...prev,
                      [field.name]: typeof v === "string" ? v : "",
                    }))
                    setValidationError(null)
                  }}
                >
                  <SelectOption value="" label={field.required ? t`Select a secret...` : t`-- None --`} />
                  {secrets.map((secret) => {
                    const secretId = uuidFromRef(secret.secret_ref)
                    return (
                      <SelectOption key={secret.secret_ref} value={secret.secret_ref} label={secret.name ?? secretId} />
                    )
                  })}
                </Select>
              </FormRow>
            ))}
          </FormSection>
        )}

        {/* Generic: add arbitrary named secret references */}
        {type === "generic" && (
          <FormSection>
            <FormRow>
              <Stack gap="2" alignment="end">
                <TextInput
                  id="generic-ref-name"
                  label={t`Name`}
                  value={pendingRefName}
                  onChange={(e) => setPendingRefName(e.target.value)}
                />
                <Select
                  id="generic-ref-secret"
                  label={t`Secret`}
                  value={pendingRefSecret}
                  onChange={(v) => setPendingRefSecret(typeof v === "string" ? v : "")}
                >
                  <SelectOption value="" label={t`Select...`} />
                  {secrets.map((secret) => {
                    const secretId = uuidFromRef(secret.secret_ref)
                    return (
                      <SelectOption key={secret.secret_ref} value={secret.secret_ref} label={secret.name ?? secretId} />
                    )
                  })}
                </Select>
                <Button
                  variant="default"
                  disabled={!pendingRefName.trim() || !pendingRefSecret}
                  onClick={handleAddGenericRef}
                >
                  {t`Add`}
                </Button>
              </Stack>
            </FormRow>
            {genericRefs.length > 0 && (
              <FormRow>
                <Stack direction="vertical" gap="2">
                  {genericRefs.map((ref, idx) => {
                    const refSecret = secrets.find((s) => s.secret_ref === ref.secret_ref)
                    const secretLabel = refSecret?.name ?? uuidFromRef(ref.secret_ref)
                    const refName = ref.name
                    return (
                      <Stack key={idx} gap="2" alignment="center" distribution="between">
                        <span className="text-sm">
                          {refName}: {secretLabel}
                        </span>
                        <Button
                          title={t`Remove`}
                          aria-label={t`Remove ${refName}`}
                          onClick={() => setGenericRefs((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          {t`Remove`}
                        </Button>
                      </Stack>
                    )
                  })}
                </Stack>
              </FormRow>
            )}
          </FormSection>
        )}
      </Form>
    </Modal>
  )
}

export function DeleteContainerModal({
  projectId,
  container,
  onClose,
}: {
  projectId: string
  container: Container
  onClose: () => void
}) {
  const { t } = useLingui()
  const containerId = uuidFromRef(container.container_ref)
  const containerName = container.name ?? containerId
  const utils = trpcReact.useUtils()
  const deleteMutation = trpcReact.keyManager.deleteContainer.useMutation({
    onSuccess: () => {
      void utils.keyManager.listContainers.invalidate()
      onClose()
    },
  })

  return (
    <Modal
      open
      size="small"
      title={t`Delete Container "${containerName}"`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, containerId })}
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={deleteMutation.isPending}
      disableCancelButton={deleteMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        {deleteMutation.error && <Message variant="error" text={deleteMutation.error.message} />}
        <p className="text-theme-default">
          {t`This action cannot be undone. The container will be permanently deleted.`}
        </p>
      </Stack>
    </Modal>
  )
}
