import { TrpcClient } from "@/client/trpcClient"
import { TRPCClientError } from "@trpc/client"
import type { ImageTypeFilter } from "@/server/Compute/types/image"

type ImageFilters = {
  image_type?: ImageTypeFilter
  status?: string
  visibility?: "public" | "private" | "shared" | "community" | "all"
  disk_format?: string
  container_format?: string
  protected?: string
  member_status?: "pending" | "accepted" | "rejected" | "all"
}

const emptyResult = {
  images: [],
  first: undefined,
  next: undefined,
  schema: "/v2/schemas/images",
  listError: undefined as string | undefined,
  // A 403 is distinct from a generic failure: the list renders a friendly "Access Denied"
  // Status rather than echoing the raw "Forbidden" message. Matches the Ceph/Storage pages.
  listForbidden: false,
}

export const createImagesPromise = (
  client: TrpcClient,
  project: string,
  sortBy: string,
  sortDirection: string,
  searchTerm: string,
  filters: ImageFilters,
  marker?: string
) => {
  if (filters.member_status && filters.member_status !== "all") {
    return client.compute.listSharedImagesByMemberStatus
      .query({
        project_id: project,
        memberStatus: filters.member_status,
        name: searchTerm || undefined,
        image_type: filters.image_type,
        status: filters.status,
        disk_format: filters.disk_format,
        container_format: filters.container_format,
        protected: filters.protected,
        sort: `${sortBy}:${sortDirection}`,
      })
      .then((images) => ({ ...emptyResult, images }))
      .catch((err: unknown) => {
        if (err instanceof TRPCClientError && err.data?.code === "FORBIDDEN") {
          return { ...emptyResult, listError: err.message, listForbidden: true }
        }
        throw err
      })
  }

  return client.compute.listImagesWithSearch
    .query({
      project_id: project,
      sort: `${sortBy}:${sortDirection}`,
      name: searchTerm || undefined,
      ...filters,
      member_status: undefined,
      marker,
    })
    .then((res) => ({ ...res, listError: undefined, listForbidden: false }))
    .catch((err: unknown) => {
      if (err instanceof TRPCClientError && err.data?.code === "FORBIDDEN") {
        return { ...emptyResult, listError: err.message, listForbidden: true }
      }
      throw err
    })
}

export const createPermissionsPromise = (client: TrpcClient, project: string) => {
  return client.compute.canUser
    .query({
      project_id: project,
      permission: [
        "images:create",
        "images:delete",
        "images:update",
        "images:create_member",
        "images:delete_member",
        "images:update_member",
      ],
    })
    .then(([canCreate, canDelete, canUpdate, canCreateMember, canDeleteMember, canUpdateMember]) => ({
      canCreate,
      canDelete,
      canUpdate,
      canCreateMember,
      canDeleteMember,
      canUpdateMember: canUpdateMember ?? false,
    }))
}
