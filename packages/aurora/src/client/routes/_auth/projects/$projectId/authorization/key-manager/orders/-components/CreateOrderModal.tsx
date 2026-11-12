import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  Form,
  FormSection,
  FormRow,
  TextInput,
  Select,
  SelectOption,
  DateTimePicker,
  Message,
  toast,
} from "@cloudoperators/juno-ui-components"
import { getOrderCreatedToast } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/KeyManagerToastNotifications"

type OrderType = "key" | "asymmetric"
const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "key", label: "Key" },
  { value: "asymmetric", label: "Asymmetric" },
]

const ALGORITHMS = [
  { value: "aes", label: "AES" },
  { value: "rsa", label: "RSA" },
  { value: "des", label: "DES" },
  { value: "3des", label: "3DES" },
  { value: "hmac", label: "HMAC" },
]

const AES_MODES = [
  { value: "cbc", label: "CBC" },
  { value: "gcm", label: "GCM" },
  { value: "ctr", label: "CTR" },
]

const ORDER_PAYLOAD_CONTENT_TYPES = [
  { value: "application/octet-stream", label: "application/octet-stream" },
  { value: "text/plain", label: "text/plain" },
]

// Bit-length presets per algorithm. Algorithms without a preset fall back to free numeric input.
const BIT_LENGTHS_BY_ALGORITHM: Record<string, number[]> = {
  aes: [128, 192, 256],
  rsa: [1024, 2048, 4096],
  des: [64],
  "3des": [128, 192],
  hmac: [128, 256, 512],
}

// The option pre-selected when an algorithm is chosen.
const DEFAULT_BIT_LENGTH: Record<string, number> = {
  aes: 256,
  rsa: 1024,
  des: 64,
  "3des": 192,
  hmac: 256,
}

const defaultBitLengthFor = (algorithm: string): string => {
  const preferred = DEFAULT_BIT_LENGTH[algorithm]
  if (preferred != null) return String(preferred)
  const presets = BIT_LENGTHS_BY_ALGORITHM[algorithm]
  return presets && presets.length > 0 ? String(presets[0]) : ""
}

interface OrderValidation {
  name?: string
  algorithm?: string
  bit_length?: string
  expiration?: string
}

export function CreateOrderModal({
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
  const [orderType, setOrderType] = useState<OrderType>("key")
  const [name, setName] = useState("")
  const [algorithm, setAlgorithm] = useState("aes")
  const [bitLength, setBitLength] = useState("256")
  const [mode, setMode] = useState("cbc")
  const [payloadContentType, setPayloadContentType] = useState("application/octet-stream")
  const [expiration, setExpiration] = useState("")
  const [validation, setValidation] = useState<OrderValidation>({})

  const createMutation = trpcReact.keyManager.createOrder.useMutation({
    onSuccess: () => {
      const { message, ...options } = getOrderCreatedToast(name.trim())
      toast.success(message, options)
      void utils.keyManager.listOrders.invalidate()
      void queryClient.invalidateQueries({ queryKey: ["km-all-orders", projectId] })
      onSuccess()
      onClose()
    },
  })

  const bitLengthPresets = BIT_LENGTHS_BY_ALGORITHM[algorithm]

  const handleAlgorithmChange = (value: string) => {
    setAlgorithm(value)
    // Bit-length options depend on the algorithm — reset to that algorithm's default.
    setBitLength(defaultBitLengthFor(value))
    setValidation((prev) => ({ ...prev, algorithm: undefined, bit_length: undefined }))
  }

  const validate = (): OrderValidation => {
    const errors: OrderValidation = {}
    if (name.length > 255) {
      errors.name = t`Name must be at most 255 characters`
    }
    if (!algorithm) {
      errors.algorithm = t`Algorithm is required.`
    }
    const parsed = parseInt(bitLength, 10)
    if (!bitLength || !Number.isInteger(parsed) || parsed < 1) {
      errors.bit_length = t`Valid bit length is required.`
    } else if (algorithm === "aes" && ![128, 192, 256].includes(parsed)) {
      errors.bit_length = t`AES supports 128, 192, or 256 bits.`
    } else if (algorithm === "rsa" && parsed < 1024) {
      errors.bit_length = t`RSA requires at least 1024 bits.`
    }
    if (expiration && new Date(expiration) <= new Date()) {
      errors.expiration = t`Expiration date must be in the future.`
    }
    return errors
  }

  const handleConfirm = () => {
    const errors = validate()
    setValidation(errors)
    if (Object.keys(errors).length > 0) return
    const trimmedName = name.trim()
    const trimmedContentType = payloadContentType.trim()
    createMutation.mutate({
      project_id: projectId,
      type: orderType,
      // Barbican uses meta.name to name the secret this order generates; omit it when blank.
      meta: {
        ...(trimmedName ? { name: trimmedName } : {}),
        algorithm,
        bit_length: parseInt(bitLength, 10),
        ...(algorithm === "aes" ? { mode } : {}),
        ...(orderType !== "asymmetric" && trimmedContentType ? { payload_content_type: trimmedContentType } : {}),
        ...(expiration ? { expiration } : {}),
      },
    })
  }

  return (
    <Modal
      open
      size="large"
      title={t`Create Order`}
      onCancel={onClose}
      onConfirm={handleConfirm}
      confirmButtonLabel={t`Create`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={createMutation.isPending || Object.values(validation).some(Boolean)}
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
              value={name}
              onChange={(e) => {
                const val = e.target.value
                setName(val)
                if (val.length > 255)
                  setValidation((prev) => ({ ...prev, name: t`Name must be at most 255 characters` }))
                else setValidation((prev) => ({ ...prev, name: undefined }))
              }}
              onBlur={() => {
                if (name.length > 255)
                  setValidation((prev) => ({ ...prev, name: t`Name must be at most 255 characters` }))
              }}
              invalid={Boolean(validation.name)}
              errortext={validation.name}
              helptext={t`${name.length}/255 characters. Names the secret this order generates.`}
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
              onBlur={() =>
                setValidation((prev) => ({
                  ...prev,
                  expiration:
                    expiration && new Date(expiration) <= new Date()
                      ? t`Expiration date must be in the future.`
                      : undefined,
                }))
              }
              invalid={Boolean(validation.expiration)}
              errortext={validation.expiration}
              helptext={t`Optional. If set, the generated secret will not be available after this UTC timestamp.`}
            />
          </FormRow>
          <FormRow>
            <Select
              id="order-type"
              label={t`Type`}
              required
              value={orderType}
              onChange={(v) => setOrderType((typeof v === "string" ? v : "key") as OrderType)}
            >
              {ORDER_TYPES.map((type) => (
                <SelectOption key={type.value} value={type.value} label={type.label} />
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Select
              id="algorithm"
              label={t`Algorithm`}
              required
              value={algorithm}
              onChange={(v) => handleAlgorithmChange(typeof v === "string" ? v : "")}
              invalid={Boolean(validation.algorithm)}
              errortext={validation.algorithm}
            >
              {ALGORITHMS.map((a) => (
                <SelectOption key={a.value} value={a.value} label={a.label} />
              ))}
            </Select>
          </FormRow>
          <FormRow>
            {bitLengthPresets ? (
              <Select
                id="bit-length"
                label={t`Bit Length`}
                required
                value={bitLength}
                onChange={(v) => {
                  setBitLength(typeof v === "string" ? v : "")
                  setValidation((prev) => ({ ...prev, bit_length: undefined }))
                }}
                invalid={Boolean(validation.bit_length)}
                errortext={validation.bit_length}
              >
                {bitLengthPresets.map((b) => (
                  <SelectOption key={b} value={String(b)} label={t`${b} bits`} />
                ))}
              </Select>
            ) : (
              <TextInput
                id="bit-length"
                type="number"
                label={t`Bit Length`}
                required
                value={bitLength}
                onChange={(e) => {
                  setBitLength(e.target.value)
                  setValidation((prev) => ({ ...prev, bit_length: undefined }))
                }}
                invalid={Boolean(validation.bit_length)}
                errortext={validation.bit_length}
              />
            )}
          </FormRow>
          {algorithm === "aes" && orderType !== "asymmetric" && (
            <FormRow>
              <Select id="mode" label={t`Mode`} value={mode} onChange={(v) => setMode(typeof v === "string" ? v : "")}>
                {AES_MODES.map((m) => (
                  <SelectOption key={m.value} value={m.value} label={m.label} />
                ))}
              </Select>
            </FormRow>
          )}
          {orderType !== "asymmetric" && (
            <FormRow>
              <Select
                id="payload-content-type"
                label={t`Payload Content Type`}
                value={payloadContentType}
                onChange={(v) => setPayloadContentType(typeof v === "string" ? v : "application/octet-stream")}
              >
                {ORDER_PAYLOAD_CONTENT_TYPES.map((ct) => (
                  <SelectOption key={ct.value} value={ct.value} label={ct.label} />
                ))}
              </Select>
            </FormRow>
          )}
        </FormSection>
      </Form>
    </Modal>
  )
}
