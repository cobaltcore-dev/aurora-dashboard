import { Button, Status } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { copyToClipboard, uuidFromRef } from "../../-components/utils"

interface OrderDetailProps {
  projectId: string
  orderId: string
  onBack: () => void
}

export function OrderDetail({ projectId, orderId, onBack }: OrderDetailProps) {
  const {
    data: order,
    isLoading,
    isError,
    error,
  } = trpcReact.keyManager.getOrder.useQuery({
    project_id: projectId,
    orderId,
  })

  if (isLoading) return <Status status="progress" title="Loading Order..." />
  if (isError) return <Status status="error" title={error?.message ?? "Failed to Load Order"} />
  if (!order) return <Status status="empty" title="Order Not Found" />

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Order: {order.type}</h2>
        <Button variant="subdued" onClick={onBack}>
          ← Back to Orders
        </Button>
      </div>

      <dl className="juno-dl">
        <dt>ID</dt>
        <dd className="flex items-center gap-2">
          {orderId}
          <Button size="small" variant="subdued" onClick={() => copyToClipboard(orderId)} label="Copy" />
        </dd>

        <dt>Reference</dt>
        <dd className="flex items-center gap-2">
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
            <dt>Secret</dt>
            <dd className="flex items-center gap-2">
              {uuidFromRef(order.secret_ref)}
              <Button size="small" variant="subdued" onClick={() => copyToClipboard(order.secret_ref!)} label="Copy" />
            </dd>
          </>
        )}

        <dt>Created</dt>
        <dd>{new Date(order.created).toLocaleString()}</dd>

        <dt>Updated</dt>
        <dd>{new Date(order.updated).toLocaleString()}</dd>

        {order.creator_id && (
          <>
            <dt>Creator ID</dt>
            <dd>{order.creator_id}</dd>
          </>
        )}
      </dl>

      {order.meta && Object.keys(order.meta).length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">Order Meta</h3>
          <dl className="juno-dl">
            {Object.entries(order.meta).map(([key, value]) => (
              <span key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </span>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
