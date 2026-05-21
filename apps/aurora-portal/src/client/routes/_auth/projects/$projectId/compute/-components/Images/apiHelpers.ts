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
  project: string,
  sortBy: string,
  sortDirection: string,
  searchTerm: string,
  filters: ImageFilters
) => {
  if (filters.member_status && filters.member_status !== "all") {
    return client.compute.listSharedImagesByMemberStatus
      .query({
        project_id: project,
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

  return client.compute.listImagesWithPagination.query({
    project_id: project,
    sort: `${sortBy}:${sortDirection}`,
    name: searchTerm || undefined,
    ...filters,
    member_status: undefined,
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
