import { Link } from "@tanstack/react-router"
import { Status, Stack, ContentHeading } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { TwoColumnDescriptionList, type DetailListItem } from "@/client/components/TwoColumnDescriptionList"
import ClipboardText from "@/client/components/ClipboardText"
import { uuidFromRef } from "../../-components/utils"

interface OrderDetailsViewProps {
  projectId: string
  orderId: string
}

export function OrderDetailsView({ projectId, orderId }: OrderDetailsViewProps) {
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

  const subStatus = order.sub_status
    ? order.sub_status_message
      ? `${order.sub_status}: ${order.sub_status_message}`
      : order.sub_status
    : "- -"

  const generatedSecretId = order.secret_ref ? uuidFromRef(order.secret_ref) : null
  const generatedSecretName = typeof order.meta?.name === "string" ? order.meta.name : null

  const detailItems: DetailListItem[] = [
    { label: t`ID`, value: <ClipboardText text={orderId} /> },
    { label: t`Reference`, value: <ClipboardText text={order.order_ref} /> },
    { label: t`Type`, value: order.type },
    { label: t`Status`, value: order.status },
    { label: t`Sub Status`, value: subStatus },
    {
      label: t`Secret`,
      value: generatedSecretId ? (
        <Link
          to="/projects/$projectId/authorization/key-manager/secrets/$secretId"
          params={{ projectId, secretId: generatedSecretId }}
          className="text-theme-link hover:text-theme-default"
        >
          {generatedSecretName ?? generatedSecretId}
        </Link>
      ) : (
        "- -"
      ),
    },
    { label: t`Created`, value: new Date(order.created).toLocaleString() },
    { label: t`Updated`, value: new Date(order.updated).toLocaleString() },
    { label: t`Creator ID`, value: order.creator_id ?? "- -" },
  ]

  const metaItems: DetailListItem[] = Object.entries(order.meta ?? {}).map(([key, value]) => ({
    id: key,
    label: key,
    value: value == null || value === "" ? "- -" : String(value),
  }))

  return (
    <>
      <ContentHeader title={`${t`Order`}: ${order.type}`} projectId={projectId} />

      <Stack direction="vertical" gap="6" className="my-6">
        <Stack direction="vertical" gap="2">
          <ContentHeading>{t`Order Details`}</ContentHeading>
          <TwoColumnDescriptionList items={detailItems} />
        </Stack>

        {metaItems.length > 0 && (
          <Stack direction="vertical" gap="2">
            <ContentHeading>{t`Metadata`}</ContentHeading>
            <TwoColumnDescriptionList items={metaItems} />
          </Stack>
        )}
      </Stack>
    </>
  )
}
