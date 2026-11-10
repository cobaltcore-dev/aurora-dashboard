import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { z } from "zod"
import { msg } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

const instancesSearchFields = {
  search: z.string().optional(),
  sortBy: z.enum(["power_state", "name", "flavor", "availability_zone", "created"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  power_state: z.string().optional(),
  flavor: z.string().optional(),
  image: z.string().optional(),
  az: z.string().optional(),
  page: z.number().int().positive().optional(),
}

const instancesSearchSchema = z.looseObject(instancesSearchFields)

export type InstancesSearchParams = z.infer<typeof instancesSearchSchema>

export const Route = createFileRoute("/_auth/projects/$projectId/compute/instances")({
  staticData: {
    section: "compute",
    service: "instances",
    analytics: {
      name: "compute.instances.list",
    },
    crumb: { text: msg`Instances` },
  } satisfies RouteInfo,
  validateSearch: (search) => {
    const result = instancesSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      search: instancesSearchFields.search.safeParse(search.search).success ? search.search : undefined,
      sortBy: instancesSearchFields.sortBy.safeParse(search.sortBy).success ? search.sortBy : undefined,
      sortDirection: instancesSearchFields.sortDirection.safeParse(search.sortDirection).success
        ? search.sortDirection
        : undefined,
      power_state: instancesSearchFields.power_state.safeParse(search.power_state).success
        ? search.power_state
        : undefined,
      flavor: instancesSearchFields.flavor.safeParse(search.flavor).success ? search.flavor : undefined,
      image: instancesSearchFields.image.safeParse(search.image).success ? search.image : undefined,
      az: instancesSearchFields.az.safeParse(search.az).success ? search.az : undefined,
      page: instancesSearchFields.page.safeParse(search.page).success ? (search.page as number) : undefined,
    }
  },
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    const serviceIndex = getServiceIndex(availableServices!)

    if (!serviceIndex["compute"]?.["nova"]) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId },
      })
    }
  },
  component: () => <Outlet />,
})
