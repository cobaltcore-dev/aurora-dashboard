import { trpc } from "./trpc"

type KeyManagerPermission =
  | "key-manager:secrets:list"
  | "key-manager:secrets:get"
  | "key-manager:secrets:payload"
  | "key-manager:secrets:create"
  | "key-manager:secrets:update"
  | "key-manager:secrets:delete"
  | "key-manager:containers:list"
  | "key-manager:containers:get"
  | "key-manager:containers:create"
  | "key-manager:containers:update"
  | "key-manager:containers:delete"
  | "key-manager:orders:list"
  | "key-manager:orders:get"
  | "key-manager:orders:create"
  | "key-manager:orders:delete"
  | "key-manager:orders:update"

export function usePermissions(
  projectId: string,
  permissions: KeyManagerPermission[]
): { permissions: Record<KeyManagerPermission, boolean>; isLoading: boolean } {
  const { data = [], isLoading } = trpc.keyManager.canUser.useQuery(
    { project_id: projectId, permission: permissions },
    { enabled: Boolean(projectId), staleTime: Infinity }
  )

  return {
    isLoading,
    permissions: Object.fromEntries(permissions.map((p, i) => [p, data[i] ?? false])) as Record<
      KeyManagerPermission,
      boolean
    >,
  }
}
