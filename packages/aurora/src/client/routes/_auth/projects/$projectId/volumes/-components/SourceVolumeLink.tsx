import { Link, useLoaderData, useRouteContext } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { useVolumePermissions } from "@/client/hooks/useVolumePermissions"
import ClipboardText from "@/client/components/ClipboardText"

export function SourceVolumeLink({ id, copyable = false }: { id: string | null | undefined; copyable?: boolean }) {
  const { projectId } = useLoaderData({ from: "/_auth/projects/$projectId" })
  const { enabledServices, deniedServices } = useRouteContext({ strict: false })
  const permissions = useVolumePermissions(projectId)
  const enabled = (!enabledServices || enabledServices.includes("volumes")) && !deniedServices?.includes("volumes")
  const canResolve = enabled && permissions.canListVolumes && permissions.canReadVolumes
  // The same project-scoped query is shared across snapshot rows and details.
  const query = trpcReact.volume.listVolumes.useQuery(
    { project_id: projectId },
    { enabled: Boolean(id) && canResolve, staleTime: 60_000, retry: false, refetchOnReconnect: false }
  )
  const volume = canResolve && !query.error ? query.data?.find((volume) => volume.id === id) : undefined

  if (!volume) return id && copyable ? <ClipboardText text={id} /> : <span>{id || "- -"}</span>
  const name = volume.name?.trim() && volume.name !== volume.id ? volume.name : undefined
  if (!name) return copyable ? <ClipboardText text={volume.id} /> : <span>{volume.id}</span>

  return (
    <div>
      <Link
        to="/projects/$projectId/volumes/$volumeId"
        params={{ projectId, volumeId: volume.id }}
        className="text-inherit hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {name}
      </Link>
      <div className="text-theme-light text-sm">{volume.id}</div>
    </div>
  )
}
