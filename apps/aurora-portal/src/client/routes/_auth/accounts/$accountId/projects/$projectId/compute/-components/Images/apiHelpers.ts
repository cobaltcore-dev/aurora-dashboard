import { TrpcClient } from "@/client/trpcClient"
import { GlanceImage } from "@/server/Compute/types/image"

type ImageFilters = {
  status?: string
  visibility?: "public" | "private" | "shared" | "community" | "all"
  disk_format?: string
  container_format?: string
  protected?: string
  member_status?: "pending" | "accepted" | "rejected" | "all"
}

export const createImagesPromise = (
  client: TrpcClient,
  sortBy: string,
  sortDirection: string,
  searchTerm: string,
  filters: ImageFilters
): Promise<GlanceImage[]> => {
  return client.compute.listImagesWithSearch.query({
    sort: `${sortBy}:${sortDirection}`,
    name: searchTerm || undefined,
    ...filters,
  })
}

export const createPermissionsPromise = (client: TrpcClient) => {
  return client.compute.canUserBulk
    .query([
      "images:create",
      "images:delete",
      "images:update",
      "images:create_member",
      "images:delete_member",
      "images:update_member",
    ])
    .then(([canCreate, canDelete, canUpdate, canCreateMember, canDeleteMember, canUpdateMember]) => ({
      canCreate,
      canDelete,
      canUpdate,
      canCreateMember,
      canDeleteMember,
      canUpdateMember: canUpdateMember ?? false,
    }))
}
