import { trpcReact } from "@/client/trpcClient"
import type { KubernetesLandscape } from "@/types/kubernetes"

export function useKubernetesPermissions(projectId: string, landscape: KubernetesLandscape) {
  const query = trpcReact.kubernetes.getPermissions.useQuery({ project_id: projectId, landscape }, { staleTime: 60000 })

  // Fail-closed: default to all false while loading or on error
  const permissions = query.data ?? {
    clusters: {
      list: false,
      create: false,
      update: false,
      delete: false,
    },
  }

  return {
    permissions,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
