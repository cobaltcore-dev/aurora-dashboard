import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { msg, t } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { SECURITY_SERVICE_SORT_KEYS, SECURITY_SERVICE_TYPE_FILTER_VALUES } from "../-components/securityServiceUtils"
import { SecurityServicesList } from "./-components/SecurityServicesList"

// URL search param validation with per-field fallback
const securityServicesSearchFields = {
  search: z.string().optional(),
  sortBy: z.enum(SECURITY_SERVICE_SORT_KEYS).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  type: z.enum(SECURITY_SERVICE_TYPE_FILTER_VALUES).optional(),
}

const securityServicesSearchSchema = z.looseObject(securityServicesSearchFields)

const validOrUndefined = <T,>(schema: z.ZodType<T>, value: unknown): T | undefined => {
  const result = schema.safeParse(value)
  return result.success ? result.data : undefined
}

export type SecurityServicesSearchParams = z.infer<typeof securityServicesSearchSchema>

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/security-services/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    crumb: { text: msg`Security Services` },
    analytics: { name: "shared-file-system.security_services.list" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Security Services` }] }),
  validateSearch: (search) => {
    const result = securityServicesSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      search: validOrUndefined(securityServicesSearchFields.search, search.search),
      sortBy: validOrUndefined(securityServicesSearchFields.sortBy, search.sortBy),
      sortDirection: validOrUndefined(securityServicesSearchFields.sortDirection, search.sortDirection),
      type: validOrUndefined(securityServicesSearchFields.type, search.type),
    }
  },
  component: SecurityServicesRoute,
})

function SecurityServicesRoute() {
  const { projectId } = Route.useParams()
  return <SecurityServicesList key={projectId} projectId={projectId} />
}
