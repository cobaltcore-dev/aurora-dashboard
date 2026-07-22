import { createFileRoute, useParams } from "@tanstack/react-router"
import { checkServiceAvailability, validateStorageRouteShape } from "../../../../-components/utils/serviceAvailability"
import { ErrorBoundary } from "react-error-boundary"
import { Trans } from "@lingui/react/macro"
import { SwiftObjects } from "../../../../-components/Swift/Objects"
import { CephObjects } from "../../../../-components/Ceph/Objects"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { BucketHeader } from "../../../../-components/Ceph/Buckets/BucketHeader"
import { StorageNotFound } from "../../../../-components/StorageNotFound"
import { Stack, Spinner } from "@cloudoperators/juno-ui-components"

// Search params schema
// - prefix: base64-encoded current folder path, safe to carry "/" chars in the URL
// - sortBy: active sort column key — persisted so deep links and back navigation restore sort state
//   Accepts both Swift keys (last_modified, bytes) and Ceph keys (lastModified, size) for compatibility
// - sortDirection: "asc" | "desc" — persisted alongside sortBy
const objectsSearchSchema = z.object({
  prefix: z.string().optional(),
  sortBy: z.enum(["name", "last_modified", "bytes", "lastModified", "size"]).optional().default("name"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  search: z.string().optional(),
  tab: z.enum(["all", "deleted"]).optional().default("all"),
})

export const Route = createFileRoute(
  "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/"
)({
  staticData: {
    section: "storage",
    service: "containers",
    analytics: {
      name: "storage.objectstore.detail",
    },
    isDetail: true,
    sectionCrumb: { labelKey: "Storage" },
    crumb: { useParamAsLabel: "provider", to: "/projects/$projectId/storage/$provider/$storageType" },
  } satisfies RouteInfo,
  validateSearch: objectsSearchSchema,
  head: ({ match }) => ({
    meta: [{ title: match.params.containerName }],
  }),
  component: () => {
    return <ObjectsDashboard />
  },
  notFoundComponent: () => {
    const { projectId } = Route.useParams()
    return <StorageNotFound projectId={projectId} />
  },
  pendingComponent: () => (
    <Stack className="p-4" distribution="center" alignment="center">
      <Spinner variant="primary" size="large" />
    </Stack>
  ),

  beforeLoad: async ({ context, params }) => {
    validateStorageRouteShape(params)
    const { trpcClient } = context
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    checkServiceAvailability(availableServices!, params)
  },
})

function ObjectsDashboard() {
  const { projectId, provider, containerName } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/",
    select: (params) => ({
      projectId: params.projectId,
      provider: params.provider,
      containerName: params.containerName,
    }),
  })

  const { prefix, sortBy, sortDirection, search } = Route.useSearch()

  // For Ceph buckets, we show ContentHeader with badges and actions
  // For Swift containers, the component handles its own header
  const showContentHeader = provider === "ceph"

  return (
    <>
      {showContentHeader && <BucketHeader bucketName={containerName} />}
      <div>
        {projectId ? (
          <ErrorBoundary
            resetKeys={[projectId, provider, containerName, prefix, sortBy, sortDirection, search]}
            fallback={
              <div className="p-4 text-center">
                <Trans>Error loading component</Trans>
              </div>
            }
          >
            {(() => {
              switch (provider) {
                case "swift":
                  return <SwiftObjects provider={provider} containerName={containerName} />
                case "ceph":
                  return <CephObjects bucketName={containerName} />
                default:
                  return (
                    <div className="p-4">
                      <Trans>Objects: {containerName}</Trans>
                    </div>
                  )
              }
            })()}
          </ErrorBoundary>
        ) : (
          <div className="p-4 text-center">
            <Trans>No project selected</Trans>
          </div>
        )}
      </div>
    </>
  )
}
