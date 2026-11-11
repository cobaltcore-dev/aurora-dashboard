import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"

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
  toast,
} from "@cloudoperators/juno-ui-components"
import type { Container } from "@/server/KeyManager/types/keyManager"
import { uuidFromRef } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/keyManagerUtils"
import { getContainerCreatedToast } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/KeyManagerToastNotifications"

const CONTAINER_TYPES: Container["type"][] = ["generic", "rsa", "certificate"]

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
  const queryClient = useQueryClient()
  const utils = trpcReact.useUtils()
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState<string | undefined>()
  const [type, setType] = useState<Container["type"]>("generic")
  // RSA / Certificate: maps field name → selected secret_ref URI
  const [namedRefs, setNamedRefs] = useState<Record<string, string>>({})
  // Generic: list of { name, secret_ref } pairs the user has added
  const [genericRefs, setGenericRefs] = useState<Array<{ name: string; secret_ref: string }>>([])
  // Pending selection for the generic "add a secret" row
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

  // Field definitions with translated labels (inside component to use t).
  // `secretType` filters the dropdown to only secrets of that Barbican type, matching the old plugin.
  const rsaFields = [
    { name: "private_key", label: t`Private Key`, required: true, secretType: "private" },
    { name: "private_key_passphrase", label: t`Private Key Passphrase`, required: false, secretType: "passphrase" },
    { name: "public_key", label: t`Public Key`, required: true, secretType: "public" },
  ]
  const certificateFields = [
    { name: "certificate", label: t`Certificate`, required: true, secretType: "certificate" },
    { name: "private_key", label: t`Private Key`, required: false, secretType: "private" },
    { name: "private_key_passphrase", label: t`Private Key Passphrase`, required: false, secretType: "passphrase" },
    { name: "intermediates", label: t`Intermediates`, required: false, secretType: "certificate" },
  ]
  const currentFields = type === "rsa" ? rsaFields : type === "certificate" ? certificateFields : null

  const createMutation = trpcReact.keyManager.createContainer.useMutation({
    onSuccess: () => {
      const { message, ...options } = getContainerCreatedToast(name.trim())
      toast.success(message, options)
      void utils.keyManager.listContainers.invalidate()
      void queryClient.invalidateQueries({ queryKey: ["km-all-containers", projectId] })
      onSuccess()
      onClose()
    },
  })

  const handleTypeChange = (newType: string) => {
    setType(newType as Container["type"])
    setNamedRefs({})
    setGenericRefs([])
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
      if (!namedRefs["private_key"]) return t`Private Key is required for RSA containers`
      if (!namedRefs["public_key"]) return t`Public Key is required for RSA containers`
    } else if (type === "certificate") {
      if (!namedRefs["certificate"]) return t`Certificate is required for certificate containers`
    }
    return null
  }

  const handleConfirm = () => {
    if (name.length > 255) {
      setNameError(t`Name must be at most 255 characters`)
      return
    }
    setNameError(undefined)
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
    if (!pendingRefSecret) return
    const secret = secrets.find((s) => s.secret_ref === pendingRefSecret)
    const baseName = secret?.name ?? uuidFromRef(pendingRefSecret)
    // Generic container secret_refs take an arbitrary name; derive it from the secret and add a
    // random suffix so adding several secrets never collides on a duplicate name (matches elektra).
    const uniqueName = `${baseName}-gen-${Math.random().toString(16).slice(2)}`
    setGenericRefs((prev) => [...prev, { name: uniqueName, secret_ref: pendingRefSecret }])
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
      disableCloseButton={createMutation.isPending}
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
              onChange={(e) => {
                setName(e.target.value)
                setNameError(undefined)
              }}
              onBlur={() => {
                if (name.length > 255) setNameError(t`Name must be at most 255 characters`)
              }}
              invalid={Boolean(nameError)}
              errortext={nameError}
              helptext={t`${name.length}/255 characters`}
            />
          </FormRow>
          <FormRow>
            <Select
              id="container-type"
              label={t`Type`}
              required
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

        {/* RSA / Certificate: fixed named secret fields, each filtered to the matching secret type */}
        {currentFields && (
          <FormSection>
            {currentFields.map((field) => {
              const fieldSecrets = secrets.filter((secret) => secret.secret_type === field.secretType)
              return (
                <FormRow key={field.name}>
                  <Select
                    id={`secret-${field.name}`}
                    label={field.required ? field.label : `${field.label} (${t`optional`})`}
                    required={field.required}
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
                    {fieldSecrets.map((secret) => {
                      const secretId = uuidFromRef(secret.secret_ref)
                      return (
                        <SelectOption
                          key={secret.secret_ref}
                          value={secret.secret_ref}
                          label={secret.name ?? secretId}
                        />
                      )
                    })}
                  </Select>
                </FormRow>
              )
            })}
          </FormSection>
        )}

        {/* Generic: pick any secrets to include; the secret_ref name is generated automatically. */}
        {type === "generic" && (
          <FormSection>
            <FormRow>
              <Stack gap="2" alignment="end">
                <Select
                  id="generic-ref-secret"
                  label={t`Secret`}
                  value={pendingRefSecret}
                  onChange={(v) => setPendingRefSecret(typeof v === "string" ? v : "")}
                  className="jn:grow"
                >
                  <SelectOption value="" label={t`Select...`} />
                  {secrets.map((secret) => {
                    const secretId = uuidFromRef(secret.secret_ref)
                    return (
                      <SelectOption key={secret.secret_ref} value={secret.secret_ref} label={secret.name ?? secretId} />
                    )
                  })}
                </Select>
                <Button variant="default" disabled={!pendingRefSecret} onClick={handleAddGenericRef}>
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
                    return (
                      <Stack key={ref.name} gap="2" alignment="center" distribution="between">
                        <span className="text-sm">{secretLabel}</span>
                        <Button
                          title={t`Remove`}
                          aria-label={t`Remove ${secretLabel}`}
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
