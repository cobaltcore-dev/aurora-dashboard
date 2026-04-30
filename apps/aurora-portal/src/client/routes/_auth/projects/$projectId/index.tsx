import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router"
import { Box, ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { Trans } from "@lingui/react/macro"

export const Route = createFileRoute("/_auth/projects/$projectId/")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const project = await context.trpcClient?.project.getProjectById.query({ id: params.projectId })
    return { description: project?.description ?? null }
  },
})

interface ServiceCardProps {
  title: string
  links: { label: string; to: string }[]
}

function ServiceCard({ title, links }: ServiceCardProps) {
  return (
    <Box className="p-5">
      <h3 className="text-theme-high mb-3 text-base font-semibold">{title}</h3>
      <ul className="space-y-1.5">
        {links.map(({ label, to }) => (
          <li key={label}>
            <Link to={to} className="text-theme-accent hover:text-theme-accent/80 text-sm">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </Box>
  )
}

function RouteComponent() {
  const { crumbProject, availableServices, projectId } = useLoaderData({
    from: "/_auth/projects/$projectId",
  })
  const { description } = Route.useLoaderData()

  const serviceIndex = getServiceIndex(availableServices ?? [])
  const base = `/projects/${projectId}`

  const cards: ServiceCardProps[] = []

  if (serviceIndex["image"]?.["glance"] || serviceIndex["compute"]?.["nova"]) {
    const links: { label: string; to: string }[] = []
    if (serviceIndex["image"]?.["glance"]) links.push({ label: "Images", to: `${base}/compute/images` })
    if (serviceIndex["compute"]?.["nova"]) links.push({ label: "Flavors", to: `${base}/compute/flavors` })
    cards.push({ title: "Compute", links })
  }

  if (serviceIndex["network"]) {
    cards.push({
      title: "Network",
      links: [
        { label: "Security Groups", to: `${base}/network/securitygroups` },
        { label: "Floating IPs", to: `${base}/network/floatingips` },
      ],
    })
  }

  if (serviceIndex["object-store"]?.["swift"]) {
    cards.push({
      title: "Storage",
      links: [{ label: "Swift", to: `${base}/storage/swift/containers` }],
    })
  }

  return (
    <Stack direction="vertical" gap="6" className="pb-4">
      <div>
        <ContentHeading>{crumbProject?.name}</ContentHeading>
        {description && <p className="text-theme-light mt-1 text-sm">{description}</p>}
      </div>
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <ServiceCard key={card.title} {...card} />
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
