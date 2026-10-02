import { useState } from "react"
import { Modal, ModalFooter, Button, Message } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { uuidFromRef } from "../../-components/utils"
import ClipboardText from "@/client/components/ClipboardText"
import type { Order } from "@/server/KeyManager/types/keyManager"

export function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useLingui()
  const orderId = uuidFromRef(order.order_ref)
  return (
    <Modal open size="large" title={`${t`Order`}: ${order.type}`} onCancel={onClose}>
      <dl className="juno-dl">
        <dt>{t`ID`}</dt>
        <dd>
          <ClipboardText text={orderId} />
        </dd>
        <dt>{t`Reference`}</dt>
        <dd>
          <ClipboardText text={order.order_ref} />
        </dd>
        <dt>{t`Type`}</dt>
        <dd>{order.type}</dd>
        <dt>{t`Status`}</dt>
        <dd>{order.status}</dd>
        {order.sub_status && (
          <>
            <dt>{t`Sub Status`}</dt>
            <dd>
              {order.sub_status}
              {order.sub_status_message && ` — ${order.sub_status_message}`}
            </dd>
          </>
        )}
        {order.secret_ref && (
          <>
            <dt>{t`Secret Ref`}</dt>
            <dd>
              <ClipboardText text={order.secret_ref} />
            </dd>
          </>
        )}
        <dt>{t`Meta`}</dt>
        <dd>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(order.meta, null, 2)}</pre>
        </dd>
        <dt>{t`Created`}</dt>
        <dd>{new Date(order.created).toLocaleString()}</dd>
        <dt>{t`Updated`}</dt>
        <dd>{new Date(order.updated).toLocaleString()}</dd>
      </dl>
      <ModalFooter>
        <Button onClick={onClose} label={t`Close`} />
      </ModalFooter>
    </Modal>
  )
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
  const [orderType, setOrderType] = useState<"key" | "asymmetric" | "certificate">("key")
  const [algorithm, setAlgorithm] = useState("aes")
  const [bitLength, setBitLength] = useState("256")

  const createMutation = trpcReact.keyManager.createOrder.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  return (
    <Modal
      open
      title={t`Create Order`}
      onCancel={onClose}
      onConfirm={() =>
        createMutation.mutate({
          project_id: projectId,
          type: orderType,
          meta: { algorithm, bit_length: parseInt(bitLength, 10) },
        })
      }
      confirmButtonLabel={createMutation.isPending ? t`Creating...` : t`Create`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={createMutation.isPending}
    >
      {createMutation.error && (
        <Message variant="error" className="mb-4">
          {createMutation.error.message}
        </Message>
      )}
      <div className="flex flex-col gap-2">
        <label>
          {t`Type`}
          <select
            className="juno-select"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as "key" | "asymmetric" | "certificate")}
          >
            <option value="key">key</option>
            <option value="asymmetric">asymmetric</option>
            <option value="certificate">certificate</option>
          </select>
        </label>
        <label>
          {t`Algorithm`}
          <input
            className="juno-input"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            placeholder="aes"
          />
        </label>
        <label>
          {t`Bit Length`}
          <input
            className="juno-input"
            type="number"
            value={bitLength}
            onChange={(e) => setBitLength(e.target.value)}
            placeholder="256"
          />
        </label>
      </div>
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
      title={t`Delete Order`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, orderId })}
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={deleteMutation.isPending}
    >
      {deleteMutation.error && (
        <Message variant="error" className="mb-4">
          {deleteMutation.error.message}
        </Message>
      )}
      <p>
        {t`Are you sure you want to delete the`} <strong>{order.type}</strong> {t`order`} <strong>{orderId}</strong>?{" "}
        {t`This cannot be undone.`}
      </p>
    </Modal>
  )
}
