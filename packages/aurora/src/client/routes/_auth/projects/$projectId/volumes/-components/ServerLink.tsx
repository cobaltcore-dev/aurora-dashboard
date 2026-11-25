import { Link } from "@tanstack/react-router"

export function ServerLink({ id, projectId }: { id: string; projectId: string }) {
  return (
    <Link
      to="/projects/$projectId/compute/instances/$instanceId"
      params={{ projectId, instanceId: id }}
      className="break-all whitespace-normal text-inherit no-underline hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {id}
    </Link>
  )
}
