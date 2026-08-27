import { createFileRoute, useParams } from "@tanstack/react-router"
import { checkServiceAvailability } from "../../../../-components/utils/serviceAvailability"
import { ErrorBoundary } from "react-error-boundary"
import { Trans } from "@lingui/react/macro"
import { SwiftObjects } from "../../../../-components/Swift/Objects"
import { CephObjects } from "../../../../-components/Ceph/Objects"
import { CephCorsRules, CephLifecycleRules } from "../../../../-components/Ceph/Buckets"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { BucketHeader } from "../../../../-components/Ceph/Buckets/BucketHeader"

// Search params schema
// - prefix: base64-encoded current folder path, safe to carry "/" chars in the URL
// - sortBy: active sort column key — persisted so deep links and back navigation restore sort state
//   Accepts both Swift keys (last_modified, bytes) and Ceph keys (lastModified, size) for compatibility
// - sortDirection: "asc" | "desc" — persisted alongside sortBy
// - view: tab selection for Ceph bucket details page (overview shows objects, cors-rules shows CORS config, lifecycle-rules shows lifecycle config)
// - corsSortBy: active sort column for CORS rules tab (ID, AllowedOrigins, etc.) — separate from objects sortBy
// - corsSortDirection: "asc" | "desc" for CORS rules — separate from objects sortDirection
// - corsSearch: search term for filtering CORS rules by Rule ID — separate from objects search
// - lifecycleSortBy: active sort column for lifecycle rules tab (ID, Status, Expiration) — separate from objects sortBy
// - lifecycleSortDirection: "asc" | "desc" for lifecycle rules — separate from objects sortDirection
// - lifecycleSearch: search term for filtering lifecycle rules by Rule ID — separate from objects search
const objectsSearchSchema = z.object({
  prefix: z.string().optional(),
  sortBy: z.enum(["name", "last_modified", "bytes", "lastModified", "size"]).optional().default("name"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  search: z.string().optional(),
  tab: z.enum(["all", "deleted"]).optional().default("all"),
  view: z.enum(["overview", "cors-rules", "lifecycle-rules"]).optional().default("overview"),
  corsSortBy: z
    .enum(["ID", "AllowedOrigins", "AllowedMethods", "AllowedHeaders", "ExposeHeaders", "MaxAgeSeconds"])
    .optional()
    .default("ID"),
  corsSortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  corsSearch: z.string().optional(),
  lifecycleSortBy: z.enum(["ID", "Status", "Expiration"]).optional().default("ID"),
  lifecycleSortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  lifecycleSearch: z.string().optional(),
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
    return (
      <p>
        <Trans>Storage container not found</Trans>
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
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    checkServiceAvailability(availableServices!, params)
  },
})

export function ObjectsDashboard() {
  const { projectId, provider, containerName } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/",
    select: (params) => ({
      projectId: params.projectId,
      provider: params.provider,
      containerName: params.containerName,
    }),
  })

  const { prefix, sortBy, sortDirection, search, view } = Route.useSearch()

  // For Ceph buckets, we show ContentHeader with badges and actions
  // For Swift containers, the component handles its own header
  const showContentHeader = provider === "ceph"

  return (
    <>
      {showContentHeader && <BucketHeader bucketName={containerName} />}
      <div>
        {projectId ? (
          <ErrorBoundary
            resetKeys={[projectId, provider, containerName, prefix, sortBy, sortDirection, search, view]}
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
                  if (view === "lifecycle-rules") {
                    return <CephLifecycleRules bucketName={containerName} />
                  }
                  if (view === "cors-rules") {
                    return <CephCorsRules bucketName={containerName} />
                  }
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
