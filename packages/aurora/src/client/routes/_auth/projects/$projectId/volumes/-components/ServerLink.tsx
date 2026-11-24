import { Link } from "@tanstack/react-router"
import ClipboardText from "@/client/components/ClipboardText"

export function ServerLink({ id, projectId, copyable = false }: { id: string; projectId: string; copyable?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1">
      <Link
        to="/projects/$projectId/compute/instances/$instanceId"
        params={{ projectId, instanceId: id }}
        className="break-all whitespace-normal text-inherit no-underline hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {id}
      </Link>
      {copyable && <ClipboardText text={id} iconOnly />}
    </div>
  )
}
