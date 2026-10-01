import { useState } from "react"
import { Modal, ModalFooter, Button, Message } from "@cloudoperators/juno-ui-components"
import { trpc } from "../../../trpc"
import { uuidFromRef, copyToClipboard } from "../../../utils"
import type { Order } from "../../../../server/types"

export function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const orderId = uuidFromRef(order.order_ref)
  return (
    <Modal open size="large" title={`Order: ${order.type}`} onCancel={onClose}>
      <dl className="juno-dl">
        <dt>ID</dt>
        <dd>
          {orderId}
          <Button size="small" variant="subdued" onClick={() => copyToClipboard(orderId)} label="Copy" />
        </dd>
        <dt>Reference</dt>
        <dd>
          {order.order_ref}
          <Button size="small" variant="subdued" onClick={() => copyToClipboard(order.order_ref)} label="Copy" />
        </dd>
        <dt>Type</dt>
        <dd>{order.type}</dd>
        <dt>Status</dt>
        <dd>{order.status}</dd>
        {order.sub_status && (
          <>
            <dt>Sub Status</dt>
            <dd>
              {order.sub_status}
              {order.sub_status_message && ` — ${order.sub_status_message}`}
            </dd>
          </>
        )}
        {order.secret_ref && (
          <>
            <dt>Secret Ref</dt>
            <dd>
              {order.secret_ref}
              <Button size="small" variant="subdued" onClick={() => copyToClipboard(order.secret_ref!)} label="Copy" />
            </dd>
          </>
        )}
        <dt>Meta</dt>
        <dd>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(order.meta, null, 2)}</pre>
        </dd>
        <dt>Created</dt>
        <dd>{new Date(order.created).toLocaleString()}</dd>
        <dt>Updated</dt>
        <dd>{new Date(order.updated).toLocaleString()}</dd>
      </dl>
      <ModalFooter>
        <Button onClick={onClose} label="Close" />
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
  const [orderType, setOrderType] = useState<"key" | "asymmetric" | "certificate">("key")
  const [algorithm, setAlgorithm] = useState("aes")
  const [bitLength, setBitLength] = useState("256")

  const createMutation = trpc.keyManager.createOrder.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  return (
    <Modal
      open
      title="Create Order"
      onCancel={onClose}
      onConfirm={() =>
        createMutation.mutate({
          project_id: projectId,
          type: orderType,
          meta: { algorithm, bit_length: parseInt(bitLength, 10) },
        })
      }
      confirmButtonLabel={createMutation.isPending ? "Creating..." : "Create"}
      cancelButtonLabel="Cancel"
      disableConfirmButton={createMutation.isPending}
    >
      {createMutation.error && (
        <Message variant="error" className="mb-4">
          {createMutation.error.message}
        </Message>
      )}
      <div className="flex flex-col gap-2">
        <label>
          Type
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
          Algorithm
          <input
            className="juno-input"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            placeholder="aes"
          />
        </label>
        <label>
          Bit Length
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
  const orderId = uuidFromRef(order.order_ref)
  const utils = trpc.useUtils()
  const deleteMutation = trpc.keyManager.deleteOrder.useMutation({
    onSuccess: () => {
      utils.keyManager.listOrders.invalidate()
      onClose()
    },
  })

  return (
    <Modal
      open
      title="Delete Order"
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, orderId })}
      confirmButtonLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel="Cancel"
      disableConfirmButton={deleteMutation.isPending}
    >
      {deleteMutation.error && (
        <Message variant="error" className="mb-4">
          {deleteMutation.error.message}
        </Message>
      )}
      <p>
        Are you sure you want to delete the <strong>{order.type}</strong> order <strong>{orderId}</strong>? This cannot
        be undone.
      </p>
    </Modal>
  )
}
