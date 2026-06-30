import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { CephBuckets } from "../../-components/Ceph/Buckets"

// Search params schema
// - sortBy: active sort column — persisted for deep links and back navigation
// - sortDirection: "asc" | "desc" — persisted alongside sortBy
// - search: active filter string — persisted so deep links preserve the current search
const bucketsSearchSchema = z.object({
  sortBy: z.enum(["name", "count", "bytes", "last_modified"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
})

export const Route = createFileRoute("/_auth/projects/$projectId/storage/ceph/buckets/")({
  staticData: {
    section: "storage",
    service: "ceph",
    sectionCrumb: { labelKey: "Storage" },
    crumb: { labelKey: "Ceph" },
  } satisfies RouteInfo,
  validateSearch: bucketsSearchSchema,
  head: () => ({ meta: [{ title: t`Object Storage (Ceph)` }] }),
  component: CephBucketsPage,
})

function CephBucketsPage() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()

  return (
    <>
      <ContentHeader title={t`Object Storage (Ceph)`} projectId={projectId} />
      <CephBuckets />
    </>
  )
}
