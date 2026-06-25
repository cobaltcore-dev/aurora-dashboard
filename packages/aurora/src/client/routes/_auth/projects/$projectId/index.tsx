import { createFileRoute, useLoaderData, useNavigate } from "@tanstack/react-router"
import { Card, Icon, Stack } from "@cloudoperators/juno-ui-components"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react/macro"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"

export const Route = createFileRoute("/_auth/projects/$projectId/")({
  component: RouteComponent,
})

interface ServiceCardProps {
  group: string
  label: string
  to: string
}

function ServiceCard({ group, label, to }: ServiceCardProps) {
  const navigate = useNavigate()
  return (
    <Card
      onClick={() => navigate({ to: to as never })}
      className="flex min-h-40 flex-col gap-4 px-3 pt-2 pb-3"
      data-testid="service-card"
    >
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1">
          <p className="text-theme-light text-xs leading-5 font-medium">{group}</p>
          <Icon icon="expandLess" size="16" className="text-theme-high" />
        </div>
        <p className="text-theme-high text-lg leading-7 font-bold" data-testid="service-card-label">
          {label}
        </p>
      </div>
      <div className="flex-1" />
    </Card>
  )
}

function RouteComponent() {
  const { crumbProject, availableServices, projectId, description } = useLoaderData({
    from: "/_auth/projects/$projectId",
  })
  const { t } = useLingui()

  const serviceIndex = getServiceIndex(availableServices ?? [])
  const base = `/projects/${projectId}`

  const cards: ServiceCardProps[] = []

  if (serviceIndex["image"]?.["glance"])
    cards.push({ group: t`Compute`, label: t`Images`, to: `${base}/compute/images` })
  if (serviceIndex["compute"]?.["nova"])
    cards.push({ group: t`Compute`, label: t`Flavors`, to: `${base}/compute/flavors` })
  if (serviceIndex["network"]) {
    cards.push({ group: t`Network`, label: t`Security Groups`, to: `${base}/network/securitygroups` })
    cards.push({ group: t`Network`, label: t`Floating IPs`, to: `${base}/network/floatingips` })
  }
  if (serviceIndex["object-store"]?.["swift"])
    cards.push({ group: t`Storage`, label: t`Object Storage (Swift)`, to: `${base}/storage/swift/containers` })
  if (serviceIndex["object-store-ceph"]?.["ceph"])
    cards.push({ group: t`Storage`, label: t`Object Storage (Ceph)`, to: `${base}/storage/ceph/buckets` })
  if (serviceIndex["pca"]?.["clavis-dev"] || serviceIndex["pca"]?.["clavis-beta"]) {
    cards.push({ group: t`Services`, label: t`PCA (Clavis)`, to: `${base}/services/pca` })
  }

  return (
    <Stack direction="vertical" gap="6" className="pb-4">
      <ContentHeader title={crumbProject?.name ?? t`Project`} projectId={projectId} description={description} />
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {cards.map((card) => (
            <ServiceCard key={card.to} {...card} />
          ))}
        </div>
      ) : (
        <p className="text-theme-light text-sm">
          <Trans>No services available for this project.</Trans>
        </p>
      )}
    </Stack>
  )
}
