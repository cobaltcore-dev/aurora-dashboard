import { useState } from "react"
import {
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
import type { Order } from "@/server/KeyManager/types/keyManager"

type OrderType = "key" | "asymmetric" | "certificate"
const ORDER_TYPES: OrderType[] = ["key", "asymmetric", "certificate"]

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
  const [orderType, setOrderType] = useState<OrderType>("key")
  const [algorithm, setAlgorithm] = useState("aes")
  const [bitLength, setBitLength] = useState("256")

  const createMutation = trpcReact.keyManager.createOrder.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  const parsedBitLength = Number(bitLength)
  const algorithmError = algorithm.trim() === "" ? t`Algorithm is required.` : undefined
  const bitLengthError =
    !Number.isInteger(parsedBitLength) || parsedBitLength <= 0 ? t`Bit length must be a positive integer.` : undefined
  const isValid = !algorithmError && !bitLengthError

  const handleConfirm = () => {
    if (!isValid) return
    createMutation.mutate({
      project_id: projectId,
      type: orderType,
      meta: { algorithm: algorithm.trim(), bit_length: parsedBitLength },
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
      disableConfirmButton={createMutation.isPending || !isValid}
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
            <Select id="order-type" label={t`Type`} value={orderType} onChange={(v) => setOrderType(v as OrderType)}>
              {ORDER_TYPES.map((type) => (
                <SelectOption key={type} value={type} label={type} />
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <TextInput
              id="algorithm"
              label={t`Algorithm`}
              required
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              invalid={Boolean(algorithmError)}
              errortext={algorithmError}
            />
          </FormRow>
          <FormRow>
            <TextInput
              id="bit-length"
              type="number"
              label={t`Bit Length`}
              required
              value={bitLength}
              onChange={(e) => setBitLength(e.target.value)}
              invalid={Boolean(bitLengthError)}
              errortext={bitLengthError}
            />
          </FormRow>
        </FormSection>
      </Form>
    </Modal>
  )
}

export function DeleteOrderModal({
  projectId,
  order,
  onClose,
}: {
  projectId: string
  order: Order
  onClose: () => void
}) {
  const { t } = useLingui()
  const orderId = uuidFromRef(order.order_ref)
  const orderTypeLabel = order.type
  const utils = trpcReact.useUtils()
  const deleteMutation = trpcReact.keyManager.deleteOrder.useMutation({
    onSuccess: () => {
      void utils.keyManager.listOrders.invalidate()
      onClose()
    },
  })

  return (
    <Modal
      open
      size="small"
      title={t`Delete Order "${orderId}"`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, orderId })}
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={deleteMutation.isPending}
      disableCancelButton={deleteMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        {deleteMutation.error && <Message variant="error" text={deleteMutation.error.message} />}
        <p className="text-theme-default">
          {t`This action cannot be undone. The ${orderTypeLabel} order will be permanently deleted.`}
        </p>
      </Stack>
    </Modal>
  )
}
