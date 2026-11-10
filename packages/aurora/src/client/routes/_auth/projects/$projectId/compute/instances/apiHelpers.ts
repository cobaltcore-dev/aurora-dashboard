import { TrpcClient } from "@/client/trpcClient"
import { TRPCClientError } from "@trpc/client"
import { Server } from "@/server/Compute/types/server"

export type ServerFilterParams = {
  power_state?: string
  availability_zone?: string
  flavor?: string
  image?: string
  key_name?: string
  locked?: string
}

export type InstancesResult = {
  servers: Server[]
  listError?: string
  // A 403 renders a friendly "Access Denied" Status rather than the raw message.
  listForbidden: boolean
}

export const createInstancesPromise = (
  client: TrpcClient,
  project: string,
  sortBy: string,
  sortDirection: string,
  searchTerm: string,
  filters: ServerFilterParams
): Promise<InstancesResult> => {
  return client.compute.getServersByProjectId
    .query({
      project_id: project,
      sort: `${sortBy}:${sortDirection}`,
      name: searchTerm || undefined,
      ...filters,
    })
    .then((servers) => ({ servers: servers ?? [], listForbidden: false }))
    .catch((err: unknown) => {
      if (err instanceof TRPCClientError && err.data?.code === "FORBIDDEN") {
        return { servers: [] as Server[], listError: err.message, listForbidden: true }
      }
      throw err
    })
}

export const createPermissionsPromise = (client: TrpcClient, project: string) => {
  return client.compute.canUser
    .query({ project_id: project, permission: ["servers:list"] })
    .then(([canList]) => ({ canList }))
}
