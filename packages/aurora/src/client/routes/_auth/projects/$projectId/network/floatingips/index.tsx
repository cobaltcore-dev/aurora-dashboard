import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { FloatingIpsList } from "./-components/FloatingIpsList"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeading } from "@cloudoperators/juno-ui-components"
import { FloatingIpQueryParametersSchema, FloatingIpStatusSchema } from "@/server/Network/types/floatingIp"

const floatingIpsSearchSchema = z.object({
  status: FloatingIpStatusSchema.catch("ACTIVE").optional(),
  search: z.string().optional(),
  sortBy: FloatingIpQueryParametersSchema.shape.sort_key.unwrap().catch("fixed_ip_address").optional(),
  sortDirection: z.enum(["asc", "desc"]).catch("asc").optional(),
})

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
  validateSearch: floatingIpsSearchSchema,
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
