import { TrpcClient } from "@/client/trpcClient"
import { GlanceImage } from "@/server/Compute/types/image"
import { MEMBER_STATUSES } from "../../-constants/filters"

type ImageFilters = {
  status?: string
  visibility?: "public" | "private" | "shared" | "community" | "all"
  disk_format?: string
  container_format?: string
  protected?: string
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
      canUpdateMember: canUpdateMember ?? true,
    }))
}

export const createSuggestedImagesPromise = (client: TrpcClient): Promise<GlanceImage[]> => {
  return client.compute.listSharedImagesByMemberStatus.query({
    memberStatus: MEMBER_STATUSES.PENDING,
  })
}

export const createAcceptedImagesPromise = (client: TrpcClient): Promise<GlanceImage[]> => {
  return client.compute.listSharedImagesByMemberStatus.query({
    memberStatus: MEMBER_STATUSES.ACCEPTED,
  })
}
