import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { Trans } from "@lingui/react/macro"
import { ErrorBoundary } from "react-error-boundary"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { SwiftObjects } from "../../../-components/Swift/Objects"

// Search params schema
// - prefix: base64-encoded current folder path, safe to carry "/" chars in the URL
// - sortBy: active sort column key — persisted so deep links and back navigation restore sort state
// - sortDirection: "asc" | "desc" — persisted alongside sortBy
// - search: active filter string
const objectsSearchSchema = z.object({
  prefix: z.string().optional(),
  sortBy: z.enum(["name", "last_modified", "bytes"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
})

export const Route = createFileRoute("/_auth/projects/$projectId/storage/swift/containers/$containerName/objects")({
  staticData: {
    section: "storage",
    service: "swift",
    isDetail: true,
    sectionCrumb: { labelKey: "Storage" },
    crumb: { labelKey: "Swift", to: "/projects/$projectId/storage/swift/containers" },
  } satisfies RouteInfo,
  validateSearch: objectsSearchSchema,
  head: ({ match }) => ({
    meta: [{ title: match.params.containerName }],
  }),
  component: SwiftObjectsPage,
  notFoundComponent: () => (
    <p>
      <Trans>Storage container not found</Trans>
    </p>
  ),
})

function SwiftObjectsPage() {
  const { projectId, containerName } = Route.useParams()
  const { prefix, sortBy, sortDirection, search } = Route.useSearch()

  return (
    <ErrorBoundary
      resetKeys={[projectId, containerName, prefix, sortBy, sortDirection, search]}
      fallback={
        <div className="p-4 text-center">
          <Trans>Error loading component</Trans>
        </div>
      }
    >
      <SwiftObjects containerName={containerName} />
    </ErrorBoundary>
  )
}
