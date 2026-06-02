import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"

const flavorsSearchFields = {
  search: z.string().optional(),
  sortBy: z.enum(["name", "vcpus", "ram", "disk", "swap"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
}

const flavorsSearchSchema = z.object(flavorsSearchFields).passthrough()

export type FlavorsSearchParams = z.infer<typeof flavorsSearchSchema>

export const Route = createFileRoute("/_auth/projects/$projectId/compute/flavors")({
  staticData: { section: "compute", service: "flavors", sectionCrumb: { label: "Compute" }, crumb: { label: "Flavors" } } satisfies RouteInfo,
  validateSearch: (search) => {
    const result = flavorsSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      search: flavorsSearchFields.search.safeParse(search.search).success ? search.search : undefined,
      sortBy: flavorsSearchFields.sortBy.safeParse(search.sortBy).success ? search.sortBy : undefined,
      sortDirection: flavorsSearchFields.sortDirection.safeParse(search.sortDirection).success
        ? search.sortDirection
        : undefined,
      page: flavorsSearchFields.page.safeParse(search.page).success ? (search.page as number) : undefined,
    }
  },
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    const serviceIndex = getServiceIndex(availableServices!)

    if (!serviceIndex["compute"]?.["nova"]) {
      throw redirect({
        to: "/projects/$projectId/compute/overview",
        params: { projectId },
      })
    }
  },
  component: () => <Outlet />,
})
