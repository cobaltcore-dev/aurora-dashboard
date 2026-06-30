import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { Trans } from "@lingui/react/macro"
import { ErrorBoundary } from "react-error-boundary"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { CephObjects } from "../../../-components/Ceph/Objects"

// Search params schema
// - prefix: base64-encoded current folder path, safe to carry "/" chars in the URL
// - sortBy: active sort column key — persisted so deep links and back navigation restore sort state
//   Accepts both Ceph keys (lastModified, size) and Swift keys (last_modified, bytes) for compatibility
// - sortDirection: "asc" | "desc" — persisted alongside sortBy
// - search: active filter string
// - tab: "all" | "deleted" — for versioned buckets
const objectsSearchSchema = z.object({
  prefix: z.string().optional(),
  sortBy: z.enum(["name", "lastModified", "size", "last_modified", "bytes"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  tab: z.enum(["all", "deleted"]).optional().default("all"),
})

export const Route = createFileRoute("/_auth/projects/$projectId/storage/ceph/buckets/$bucketName/objects")({
  staticData: {
    section: "storage",
    service: "ceph",
    isDetail: true,
    sectionCrumb: { labelKey: "Storage" },
    crumb: { labelKey: "Ceph", to: "/projects/$projectId/storage/ceph/buckets" },
  } satisfies RouteInfo,
  validateSearch: objectsSearchSchema,
  head: ({ match }) => ({
    meta: [{ title: match.params.bucketName }],
  }),
  component: CephObjectsPage,
  notFoundComponent: () => (
    <p>
      <Trans>Storage bucket not found</Trans>
    </p>
  ),
})

function CephObjectsPage() {
  const { projectId, bucketName } = Route.useParams()
  const { prefix, sortBy, sortDirection, search, tab } = Route.useSearch()

  return (
    <>
      <ContentHeader title={bucketName} projectId={projectId} />
      <ErrorBoundary
        resetKeys={[projectId, bucketName, prefix, sortBy, sortDirection, search, tab]}
        fallback={
          <div className="p-4 text-center">
            <Trans>Error loading component</Trans>
          </div>
        }
      >
        <CephObjects bucketName={bucketName} />
      </ErrorBoundary>
    </>
  )
}
