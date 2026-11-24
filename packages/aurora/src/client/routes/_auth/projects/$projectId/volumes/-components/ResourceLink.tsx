import { Link, useLoaderData, useRouteContext } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { useVolumePermissions } from "@/client/hooks/useVolumePermissions"
import { findCinderService } from "@/types/volume"
import { ServerLink } from "./ServerLink"
import ClipboardText from "@/client/components/ClipboardText"

export function ResourceLink({
  id,
  resource,
  label,
  className = "",
  copyable = false,
}: {
  id: string | null | undefined
  resource: "volume" | "snapshot" | "instance"
  label?: string
  className?: string
  copyable?: boolean
}) {
  const { projectId, availableServices } = useLoaderData({ from: "/_auth/projects/$projectId" })
  const { enabledServices, deniedServices } = useRouteContext({ strict: false })
  const permissions = useVolumePermissions(projectId)
  const service = resource === "instance" ? "instances" : "volumes"
  const enabled = (!enabledServices || enabledServices.includes(service)) && !deniedServices?.includes(service)
  const validId = id && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)
  const allowed =
    resource === "instance"
      ? Boolean(getServiceIndex(availableServices ?? [])["compute"]?.["nova"])
      : Boolean(findCinderService(availableServices ?? [])) &&
        (resource === "volume" ? permissions.canReadVolumes : permissions.canReadSnapshots)
  if (!validId || !enabled || !allowed)
    return id && copyable ? (
      <ClipboardText text={id} className="break-all whitespace-normal" />
    ) : (
      <span className="break-all whitespace-normal">{id || "- -"}</span>
    )
  const props = {
    className: `text-inherit no-underline break-all whitespace-normal ${className}`,
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
  }
  if (resource === "instance") return <ServerLink id={id} projectId={projectId} copyable={copyable} />
  return (
    <div className="inline-flex items-center gap-1">
      {resource === "snapshot" ? (
        <Link {...props} to="/projects/$projectId/volumes/snapshots/$snapshotId" params={{ projectId, snapshotId: id }}>
          {label || id}
        </Link>
      ) : (
        <Link {...props} to="/projects/$projectId/volumes/$volumeId" params={{ projectId, volumeId: id }}>
          {label || id}
        </Link>
      )}
      {copyable && <ClipboardText text={id} iconOnly />}
    </div>
  )
}
