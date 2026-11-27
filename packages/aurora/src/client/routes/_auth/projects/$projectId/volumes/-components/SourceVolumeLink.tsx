import { Link, useLoaderData, useRouteContext } from "@tanstack/react-router"
import { Stack } from "@cloudoperators/juno-ui-components"
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
    <Stack direction="vertical" gap="0.5" className="min-w-0">
      <Link
        to="/projects/$projectId/volumes/$volumeId"
        params={{ projectId, volumeId: volume.id }}
        className="break-all text-inherit hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {name}
      </Link>
      <ClipboardText text={volume.id} className="text-theme-light text-sm" />
    </Stack>
  )
}
