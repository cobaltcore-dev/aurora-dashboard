import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"

const multiValueEnum = (allowedValues: string[]) => {
  return z.string().refine((val) => {
    const values = val.startsWith("in:") ? val.replace("in:", "").split(",") : [val]
    return values.every((v) => allowedValues.includes(v))
  })
}

const imagesSearchFields = {
  status: multiValueEnum([
    "queued",
    "saving",
    "active",
    "deactivated",
    "killed",
    "deleted",
    "pending_delete",
  ]).optional(),
  visibility: z.enum(["public", "private", "shared", "community", "all"]).optional(),
  disk_format: multiValueEnum([
    "ami",
    "ari",
    "aki",
    "vhd",
    "vhdx",
    "vmdk",
    "raw",
    "qcow2",
    "vdi",
    "iso",
    "ploop",
  ]).optional(),
  container_format: multiValueEnum(["ami", "ari", "aki", "bare", "ovf", "ova", "docker"]).optional(),
  protected: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["created_at", "updated_at", "name", "size", "status"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
}

const imagesSearchSchema = z.object(imagesSearchFields).passthrough()

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/images")({
  staticData: { section: "compute", service: "images" } satisfies RouteInfo,
  validateSearch: (search) => {
    const result = imagesSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      status: imagesSearchFields.status.safeParse(search.status).success ? search.status : undefined,
      visibility: imagesSearchFields.visibility.safeParse(search.visibility).success ? search.visibility : undefined,
      disk_format: imagesSearchFields.disk_format.safeParse(search.disk_format).success
        ? search.disk_format
        : undefined,
      container_format: imagesSearchFields.container_format.safeParse(search.container_format).success
        ? search.container_format
        : undefined,
      protected: imagesSearchFields.protected.safeParse(search.protected).success ? search.protected : undefined,
      search: imagesSearchFields.search.safeParse(search.search).success ? search.search : undefined,
      sortBy: imagesSearchFields.sortBy.safeParse(search.sortBy).success ? search.sortBy : undefined,
      sortDirection: imagesSearchFields.sortDirection.safeParse(search.sortDirection).success
        ? search.sortDirection
        : undefined,
    }
  },
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId, projectId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    const serviceIndex = getServiceIndex(availableServices!)

    if (!serviceIndex["image"]?.["glance"]) {
      throw redirect({
        to: "/accounts/$accountId/projects/$projectId/compute/overview",
        params: { accountId, projectId },
      })
    }
  },
  component: () => <Outlet />,
})
