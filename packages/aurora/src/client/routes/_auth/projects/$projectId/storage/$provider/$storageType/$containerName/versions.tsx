import { createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { ObjectVersionsView } from "@/client/routes/_auth/projects/$projectId/storage/-components/Ceph/Objects/ObjectVersionsView"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { z } from "zod"

// Search params schema for passing objectKey
const versionsSearchSchema = z.object({
  objectKey: z.string().optional(),
})

export const Route = createFileRoute(
  "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/versions"
)({
  staticData: {
    section: "storage",
    service: "buckets",
    isDetail: true,
    sectionCrumb: { labelKey: "Storage" },
    crumb: { useParamAsLabel: "provider", to: "/projects/$projectId/storage/$provider/$storageType" },
  } satisfies RouteInfo,
  validateSearch: versionsSearchSchema,
  head: ({ match }) => ({
    meta: [{ title: match.params.containerName }],
  }),
  component: RouteComponent,
  notFoundComponent: () => {
    return (
      <p>
        <Trans>Object not found</Trans>
      </p>
    )
  },
  loader: async ({ context }) => {
    const { trpcClient } = context
    const availableServices = await trpcClient?.auth.getAvailableServices.query()

    return {
      client: trpcClient,
      availableServices,
    }
  },
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId, provider } = params

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []
    const serviceIndex = getServiceIndex(availableServices)

    // Redirect to the "Projects Overview" page if no storage services available
    if (!serviceIndex["object-store"]) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId },
      })
    }

    // Check if Ceph is available (with fallback)
    const hasCeph = Boolean(serviceIndex["object-store"]["ceph"])
    const cephFallbackEnabled = true
    const hasEffectiveCeph = hasCeph || cephFallbackEnabled

    if (provider === "ceph" && !hasEffectiveCeph) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId },
      })
    }
  },
})

function RouteComponent() {
  const { containerName } = Route.useParams()
  const search = Route.useSearch()

  const objectKey = search.objectKey ? decodeURIComponent(search.objectKey) : ""

  if (!objectKey) {
    return (
      <div>
        <p>
          <Trans>No object specified</Trans>
        </p>
      </div>
    )
  }

  return <ObjectVersionsView bucketName={containerName} objectKey={objectKey} />
}
