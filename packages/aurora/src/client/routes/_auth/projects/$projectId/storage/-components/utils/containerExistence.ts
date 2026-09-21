import { notFound } from "@tanstack/react-router"
import { isTRPCClientError } from "@trpc/client"
import type { TrpcClient } from "@/client/trpcClient"
import type { ContainerInfo } from "@/server/Storage/types/swift"
import { STORAGE_PROVIDER, type StorageProvider } from "@/client/utils/storageProviders"

export interface ContainerProbe {
  containerInfo?: ContainerInfo
  fetchedAt: number
}

export const CONTAINER_NOT_FOUND = "container-not-found"

const isNotFoundResponse = (error: unknown): boolean => isTRPCClientError(error) && error.data?.code === "NOT_FOUND"

export const requireContainerExists = async (
  trpcClient: TrpcClient,
  params: { projectId: string; provider: StorageProvider; containerName: string }
): Promise<ContainerProbe> => {
  const { projectId, provider, containerName } = params

  let missing = false
  let containerInfo: ContainerInfo | undefined
  try {
    if (provider === STORAGE_PROVIDER.SWIFT) {
      containerInfo = await trpcClient.storage.swift.getContainerMetadata.query({
        project_id: projectId,
        container: containerName,
      })
    } else {
      await trpcClient.storage.ceph.containers.head.query({ project_id: projectId, bucketName: containerName })
    }
  } catch (error) {
    if (!isTRPCClientError(error)) throw error
    missing = isNotFoundResponse(error)
  }

  if (missing) {
    throw notFound({ data: { reason: CONTAINER_NOT_FOUND } })
  }

  return { containerInfo, fetchedAt: Date.now() }
}
