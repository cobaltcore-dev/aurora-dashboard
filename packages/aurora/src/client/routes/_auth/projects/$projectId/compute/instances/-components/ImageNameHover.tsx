import { Link } from "@tanstack/react-router"
import { Stack } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import ClipboardText from "@/client/components/ClipboardText"

interface ImageNameHoverProps {
  imageId: string
  projectId: string
}

/**
 * Image reference for the list/detail. The name is resolved eagerly via
 * `compute.getImageById` (the list is paginated, so only ~page-size rows query
 * at once; TanStack dedupes repeated ids). The lookup is project-scoped:
 *
 * - resolved → the **name links** to the image detail,
 * - not resolvable (private/other-owner → 404/FORBIDDEN, or still loading) →
 *   the raw **id as plain text with a copy control**, so it stays actionable
 *   without a dead link.
 *
 * See the memory note instances-image-flavor-resolution-constraints.
 */
export function ImageNameHover({ imageId, projectId }: ImageNameHoverProps) {
  const { data, status } = trpcReact.compute.getImageById.useQuery({ project_id: projectId, imageId }, { retry: false })

  const resolvedName = status === "success" && data?.name ? String(data.name) : undefined

  // Resolved → name links to the image. Otherwise show the id with a copy control
  // (loading, error, or an image not accessible in this project).
  if (resolvedName) {
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

  return (
    <Stack direction="horizontal" gap="1" alignment="center">
      <ClipboardText text={imageId} truncateAt={8} />
    </Stack>
  )
}
