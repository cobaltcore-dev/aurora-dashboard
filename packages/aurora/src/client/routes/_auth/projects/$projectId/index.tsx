import { createFileRoute, useLoaderData, useNavigate } from "@tanstack/react-router"
import { Card, Icon, Stack } from "@cloudoperators/juno-ui-components"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react/macro"
import { useRouteContext } from "@tanstack/react-router"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { Slot } from "@/client/components/Slot"
import { canAccessClavisPca } from "@/client/routes/_auth/projects/$projectId/services/pca/-components/pcaAccess"

export const Route = createFileRoute("/_auth/projects/$projectId/")({
  component: RouteComponent,
})

interface ServiceCardProps {
  group: string
  label: string
  to: string
  service: string
}

function ServiceCard({ group, label, to, service }: ServiceCardProps) {
  const navigate = useNavigate()
  const { slots } = useRouteContext({ strict: false })

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
        <div className="flex items-center gap-2">
          <p className="text-theme-high text-lg leading-7 font-bold" data-testid="service-card-label">
            {label}
          </p>
          {slots?.serviceBadge && <Slot component={slots.serviceBadge} useShadowDOM={false} currentService={service} />}
        </div>
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
  const { slots, enabledServices } = useRouteContext({ strict: false })
  const isEnabled = (service: string) => !enabledServices || enabledServices.includes(service)

  const serviceIndex = getServiceIndex(availableServices ?? [])
  const base = `/projects/${projectId}`

  const cards: ServiceCardProps[] = []

  if (serviceIndex["image"]?.["glance"] && isEnabled("images"))
    cards.push({ group: t`Compute`, label: t`Images`, to: `${base}/compute/images`, service: "images" })
  if (serviceIndex["compute"]?.["nova"] && isEnabled("flavors"))
    cards.push({ group: t`Compute`, label: t`Flavors`, to: `${base}/compute/flavors`, service: "flavors" })
  if (serviceIndex["network"]) {
    if (isEnabled("securitygroups"))
      cards.push({
        group: t`Network`,
        label: t`Security Groups`,
        to: `${base}/network/securitygroups`,
        service: "securitygroups",
      })
    if (isEnabled("floatingips"))
      cards.push({
        group: t`Network`,
        label: t`Floating IPs`,
        to: `${base}/network/floatingips`,
        service: "floatingips",
      })
  }
  if (serviceIndex["object-store"]?.["swift"] && isEnabled("containers"))
    cards.push({
      group: t`Storage`,
      label: t`Object Storage (Swift)`,
      to: `${base}/storage/swift/containers`,
      service: "containers",
    })
  if (serviceIndex["object-store-ceph"]?.["ceph"] && isEnabled("ceph-containers"))
    cards.push({
      group: t`Storage`,
      label: t`Object Storage (Ceph)`,
      to: `${base}/storage/ceph/buckets`,
      service: "ceph-containers",
    })
  if (canAccessClavisPca(serviceIndex, enabledServices)) {
    cards.push({ group: t`Services`, label: t`PCA (Clavis)`, to: `${base}/services/pca`, service: "pca" })
  }

  return (
    <Stack direction="vertical">
      <ContentHeader title={crumbProject?.name ?? t`Project`} projectId={projectId} description={description} />
      {slots?.projectOverviewBanner && (
        <div className="mb-6">
          <Slot component={slots.projectOverviewBanner} useShadowDOM={false} />
        </div>
      )}
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
