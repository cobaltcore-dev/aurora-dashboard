import { Button, Status } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import ClipboardText from "@/client/components/ClipboardText"
import { uuidFromRef } from "../../-components/utils"

interface OrderDetailProps {
  projectId: string
  orderId: string
  onBack: () => void
}

export function OrderDetail({ projectId, orderId, onBack }: OrderDetailProps) {
  const { t } = useLingui()
  const {
    data: order,
    isLoading,
    isError,
    error,
  } = trpcReact.keyManager.getOrder.useQuery({
    project_id: projectId,
    orderId,
  })

  if (isLoading) return <Status status="progress" title={t`Loading Order...`} />
  if (isError) return <Status status="error" title={error?.message ?? t`Failed to Load Order`} />
  if (!order) return <Status status="empty" title={t`Order Not Found`} />

  return (
    <div className="max-w-3xl">
      <ContentHeader
        title={`${t`Order`}: ${order.type}`}
        projectId={projectId}
        actions={
          <Button variant="subdued" onClick={onBack}>
            {t`← Back to Orders`}
          </Button>
        }
      />

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
            <dt>{t`Secret`}</dt>
            <dd>
              <ClipboardText text={uuidFromRef(order.secret_ref)} />
            </dd>
          </>
        )}

        <dt>{t`Created`}</dt>
        <dd>{new Date(order.created).toLocaleString()}</dd>

        <dt>{t`Updated`}</dt>
        <dd>{new Date(order.updated).toLocaleString()}</dd>

        {order.creator_id && (
          <>
            <dt>{t`Creator ID`}</dt>
            <dd>{order.creator_id}</dd>
          </>
        )}
      </dl>

      {order.meta && Object.keys(order.meta).length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">{t`Order Meta`}</h3>
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
