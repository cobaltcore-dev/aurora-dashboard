import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { FloatingIpsList } from "./-components/FloatingIpsList"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeading } from "@cloudoperators/juno-ui-components"
import { FloatingIpQueryParametersSchema, FloatingIpStatusSchema } from "@/server/Network/types/floatingIp"

const floatingIpsSearchFields = {
  status: FloatingIpStatusSchema.optional(),
  search: z.string().optional(),
  sortBy: FloatingIpQueryParametersSchema.shape.sort_key.unwrap().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
}

const floatingIpsSearchSchema = z.object(floatingIpsSearchFields).passthrough()

export const Route = createFileRoute("/_auth/projects/$projectId/network/floatingips/")({
  staticData: {
    section: "network",
    service: "floatingips",
    analytics: {
      name: "network.floatingips.list",
    },
    sectionCrumb: { labelKey: "Network" },
    crumb: { labelKey: "Floating IPs" },
  } satisfies RouteInfo,
  validateSearch: (search) => {
    const result = floatingIpsSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      status: floatingIpsSearchFields.status.safeParse(search.status).success ? search.status : undefined,
      search: floatingIpsSearchFields.search.safeParse(search.search).success ? search.search : undefined,
      sortBy: floatingIpsSearchFields.sortBy.safeParse(search.sortBy).success ? search.sortBy : undefined,
      sortDirection: floatingIpsSearchFields.sortDirection.safeParse(search.sortDirection).success
        ? search.sortDirection
        : undefined,
    }
  },
  head: () => ({ meta: [{ title: t`Floating IPs` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  return (
    <>
      <ContentHeading>{t`Floating IPs`}</ContentHeading>
      <FloatingIpsList />
    </>
  )
}
