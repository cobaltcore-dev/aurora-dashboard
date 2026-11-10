import { Link } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { EMPTY_VALUE } from "../-utils/instanceDisplay"

interface ImageNameLinkProps {
  imageId: string
  projectId: string
}

/**
 * Resolves an image id to its name. The name is resolved eagerly via
 * `compute.getImageById` (the list is paginated, so only ~page-size rows query
 * at once; TanStack dedupes repeated ids). The lookup is project-scoped:
 *
 * - resolved → the **name links** to the image detail,
 * - not resolvable (private/other-owner → 404/FORBIDDEN, or still loading) →
 *   "- -", since the raw id isn't actionable without access.
 *
 * See the memory note instances-image-flavor-resolution-constraints.
 */
export function ImageNameLink({ imageId, projectId }: ImageNameLinkProps) {
  const { data, status } = trpcReact.compute.getImageById.useQuery({ project_id: projectId, imageId }, { retry: false })

  const resolvedName = status === "success" && data?.name ? String(data.name) : undefined

  // Resolved → name links to the image. Otherwise "- -" (loading, error, or an
  // image not accessible in this project).
  if (!resolvedName) return <>{EMPTY_VALUE}</>

  return (
    <Link
      to="/projects/$projectId/compute/images/$imageId"
      params={{ projectId, imageId }}
      className="break-all text-inherit hover:underline"
    >
      {resolvedName}
    </Link>
  )
}
