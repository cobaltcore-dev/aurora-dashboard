import { Link } from "@tanstack/react-router"
import type { Server } from "@/server/Compute/types/server"
import { trpcReact } from "@/client/trpcClient"
import { flavorName } from "../-utils/instanceDisplay"

interface FlavorLinkProps {
  instance: Server
  projectId: string
}

/**
 * Flavor name as a link to the flavor detail. The server payload has no flavor
 * id, so we resolve it by matching original_name against the project's flavor
 * list (one shared, cached query). The name is a link when the id resolves;
 * plain text otherwise.
 */
export function FlavorLink({ instance, projectId }: FlavorLinkProps) {
  const name = flavorName(instance)

  // Shared across all rows/detail (same input → one cached request).
  const { data } = trpcReact.compute.getFlavorsByProjectId.useQuery({ project_id: projectId })
  const flavorId = data?.flavors?.find((f) => f.name === instance.flavor?.original_name)?.id

  if (!flavorId) return <span>{name}</span>

  return (
    <Link
      to="/projects/$projectId/compute/flavors/$flavorId"
      params={{ projectId, flavorId }}
      className="text-inherit hover:underline"
    >
      {name}
    </Link>
  )
}
