import { TrpcClient } from "@/client/trpcClient"

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
  projectId: string,
  sortBy: string,
  sortDirection: string,
  searchTerm: string,
  filters: ImageFilters,
  marker?: string
) => {
  // If member_status filter is set (and not "all"), use the dedicated endpoint
  if (filters.member_status && filters.member_status !== "all") {
    // For member status, return all results as a single page
    return client.compute.listSharedImagesByMemberStatus
      .query({
        project_id: projectId,
        memberStatus: filters.member_status,
        name: searchTerm || undefined,
        status: filters.status,
        disk_format: filters.disk_format,
        container_format: filters.container_format,
        protected: filters.protected,
        sort: `${sortBy}:${sortDirection}`,
      })
      .then((images) => ({
        images,
        first: undefined,
        next: undefined,
        schema: "/v2/schemas/images",
      }))
  }

  // Otherwise use the regular search endpoint with pagination
  return client.compute.listImagesWithSearch.query({
    project_id: projectId,
    sort: `${sortBy}:${sortDirection}`,
    name: searchTerm || undefined,
    ...filters,
    member_status: undefined, // Don't pass member_status to this endpoint
    marker,
  })
}

export const createPermissionsPromise = (client: TrpcClient, projectId: string) => {
  return client.compute.canUser
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
