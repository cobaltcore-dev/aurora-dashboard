import {
  createFileRoute,
  useNavigate,
  useParams,
  type ErrorComponentProps,
  type NotFoundRouteComponent,
} from "@tanstack/react-router"
import type { ReactNode } from "react"
import { Button } from "@cloudoperators/juno-ui-components"
import { isTRPCClientError } from "@trpc/client"
import { guardStorageRoute, type StorageNotFoundReason } from "../../../../-components/utils/serviceAvailability"
import { CONTAINER_NOT_FOUND, requireContainerExists } from "../../../../-components/utils/containerExistence"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { ErrorBoundary } from "react-error-boundary"
import { Trans, useLingui } from "@lingui/react/macro"
import { SwiftObjects } from "../../../../-components/Swift/Objects"
import { CephObjects } from "../../../../-components/Ceph/Objects"
import { CephCorsRules, CephLifecycleRules } from "../../../../-components/Ceph/Buckets"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { BucketHeader } from "../../../../-components/Ceph/Buckets/BucketHeader"
import { ContainerHeader } from "../../../../-components/Swift/Containers/ContainerHeader"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { StorageNotFound } from "../../../../-components/StorageNotFound"
import { STORAGE_PROVIDER } from "@/client/utils/storageProviders"

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

/**
 * "Back to Buckets"/"Back to Containers" — the exit both boundaries below want. The list
 * is the one page that is certainly still there, so it beats `RouteIdLevelDefaultError`'s
 * default "Go to Project Home", which leaves storage altogether.
 *
 * Returns undefined when the params aren't readable, so the caller falls back to that
 * default rather than rendering a button that can't build a target.
 */
function useBackToContainerList(): ReactNode {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId, provider, storageType } = useParams({ strict: false })

  if (!projectId || !provider || !storageType) return undefined

  return (
    <Button
      variant="primary"
      onClick={() =>
        navigate({
          to: "/projects/$projectId/storage/$provider/$storageType",
          params: { projectId, provider, storageType },
        })
      }
    >
      {provider === STORAGE_PROVIDER.CEPH ? t`Back to Buckets` : t`Back to Containers`}
    </Button>
  )
}

/**
 * The route's single notFound boundary serves two unrelated 404s, so it dispatches on the
 * reason the throw carried:
 *
 * - the address is wrong (bad provider, non-canonical storage-type) → `StorageNotFound`,
 *   whose action leads out of storage entirely, because no storage page here is valid;
 * - the address is fine but the container isn't there → `RouteIdLevelDefaultError`, whose
 *   action leads back to the list, which is a page the user can actually use.
 *
 * (The router spreads the whole notFound error object into these props, so the reason
 * arrives nested under `data` — see StorageNotFound for the three files that establish it.)
 */
function ObjectsNotFound({ data }: { data?: { reason?: StorageNotFoundReason | typeof CONTAINER_NOT_FOUND } }) {
  const { t } = useLingui()
  const { provider } = useParams({ strict: false })
  const backToList = useBackToContainerList()

  const reason = data?.reason

  if (reason !== CONTAINER_NOT_FOUND) {
    return <StorageNotFound data={reason ? { reason } : undefined} />
  }

  const isCeph = provider === STORAGE_PROVIDER.CEPH

  return (
    <RouteIdLevelDefaultError
      errorTitle={isCeph ? t`Bucket Not Found` : t`Container Not Found`}
      errorDescription={
        isCeph
          ? t`This bucket does not exist or is not accessible in this project.`
          : t`This container does not exist or is not accessible in this project.`
      }
      action={backToList}
    />
  )
}

/**
 * Route-level error boundary — for a request that failed, as opposed to a resource that
 * isn't there. Deliberately a boundary of its own: #1304 points one component at both, and
 * since that component hardcodes `code={404}` a 500 arrives labelled "Resource Not Found".
 * The split is in what the two say, not in which component they use — `code` is what lets
 * this one state the real status instead of inheriting that default.
 *
 * Catching here rather than letting it reach the root keeps everything the parent routes
 * render — shell, nav, the breadcrumb trail up to this page — on screen, and lets the
 * boundary reset when the user navigates.
 */
function ObjectsError({ error }: ErrorComponentProps) {
  const { t } = useLingui()
  const backToList = useBackToContainerList()
  const trpcError = isTRPCClientError(error) ? error : undefined

  return (
    <RouteIdLevelDefaultError
      code={trpcError?.data?.httpStatus ?? null}
      errorTitle={t`Unable to Load Content`}
      errorDescription={trpcError?.message ?? t`An unexpected error occurred.`}
      action={backToList}
    />
  )
}

export const Route = createFileRoute(
  "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/"
)({
  staticData: {
    section: "storage",
    service: "containers",
    analytics: {
      name: "storage.objectstore.detail",
    },
  } satisfies RouteInfo,
  validateSearch: objectsSearchSchema,
  head: ({ match }) => ({
    meta: [{ title: match.params.containerName }],
  }),
  component: () => {
    return <ObjectsDashboard />
  },
  notFoundComponent: ObjectsNotFound as NotFoundRouteComponent,
  errorComponent: ObjectsError,
  loader: async ({ context, params }) => {
    const { trpcClient } = context
    if (!trpcClient) {
      throw new Error("trpcClient is not available in route context")
    }
    const availableServices = (await trpcClient.auth.getAvailableServices.query()) ?? []
    const provider = guardStorageRoute(availableServices, params)
    return requireContainerExists(trpcClient, { ...params, provider })
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

  useSetBreadcrumb(Route.id, containerName)

  const { prefix, sortBy, sortDirection, search, view } = Route.useSearch()

  return (
    <>
      {provider === STORAGE_PROVIDER.CEPH && <BucketHeader bucketName={containerName} />}
      {provider === STORAGE_PROVIDER.SWIFT && <ContainerHeader containerName={containerName} />}
      {/* Ceph gets extra breathing room below its header from BucketHeader's own
          tabs block; Swift has no such block, so pad the content wrapper directly
          to avoid the overflow menu sitting too close to the toolbar below it. */}
      <div className={provider === STORAGE_PROVIDER.SWIFT ? "pt-4" : undefined}>
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
                case STORAGE_PROVIDER.SWIFT:
                  return <SwiftObjects provider={provider} containerName={containerName} />
                case STORAGE_PROVIDER.CEPH:
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
