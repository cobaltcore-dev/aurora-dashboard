import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Tooltip, TooltipTrigger, TooltipContent, Icon, Stack } from "@cloudoperators/juno-ui-components"
import { TRPCClientError } from "@trpc/client"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"

interface ImageNameHoverProps {
  imageId: string
  projectId: string
  /** Detail view resolves on mount; the list resolves lazily on first hover. */
  eager?: boolean
  /**
   * Detail view: show the **id** as the link label (no name, no info icon).
   * The id still only links once the image resolves (i.e. is reachable here);
   * otherwise it stays plain text.
   */
  showIdAsLabel?: boolean
  /** Force the tooltip open (used in tests; normally driven by hover). */
  open?: boolean
}

/**
 * Image id/name with an info icon. The id renders as **plain text**; it only
 * becomes a **link to the image detail once the name resolves** (resolving
 * confirms the image is visible to this project). Hovering the icon previews
 * the lookup and never navigates. The lookup is project-scoped, so images owned
 * by another project and not shared return 404 — the id then stays plain text
 * with a "not accessible" note. See the memory note
 * instances-image-flavor-resolution-constraints.
 *
 * With `showIdAsLabel` (detail view) the label is the id instead of the name and
 * the info icon/tooltip is omitted; the id becomes a link only when reachable.
 */
export function ImageNameHover({
  imageId,
  projectId,
  eager = false,
  showIdAsLabel = false,
  open,
}: ImageNameHoverProps) {
  const { t } = useLingui()
  const [hovered, setHovered] = useState(false)
  const enabled = eager || hovered || open === true

  const { data, status, error } = trpcReact.compute.getImageById.useQuery(
    { project_id: projectId, imageId },
    { enabled, retry: false }
  )

  // A project-scoped token can't read images it doesn't own/share → 404/FORBIDDEN.
  const notAccessible =
    error instanceof TRPCClientError && (error.data?.code === "NOT_FOUND" || error.data?.code === "FORBIDDEN")

  const resolvedName = data?.name ? String(data.name) : undefined
  // Reachable once the lookup returns an image (success implies visible here).
  const reachable = status === "success" && !!data
  const label = showIdAsLabel ? imageId : resolvedName

  // Detail (showIdAsLabel): id links once reachable, no name/icon.
  if (showIdAsLabel) {
    return reachable ? (
      <Link
        to="/projects/$projectId/compute/images/$imageId"
        params={{ projectId, imageId }}
        className="break-all text-inherit hover:underline"
      >
        {imageId}
      </Link>
    ) : (
      <span className="break-all">{imageId}</span>
    )
  }

  const tooltipBody = () => {
    if (notAccessible) return <span>{t`Image not accessible in this project`}</span>
    if (!enabled || status === "pending") return <span>{t`Resolving name…`}</span>
    if (status === "error") return <span>{t`Could not resolve image name`}</span>
    return <span className="font-medium break-all">{resolvedName || imageId}</span>
  }

  return (
    <Stack direction="horizontal" gap="1" alignment="center">
      {label ? (
        // Only link once the name resolves — confirms the image is reachable here.
        <Link
          to="/projects/$projectId/compute/images/$imageId"
          params={{ projectId, imageId }}
          className="break-all text-inherit hover:underline"
        >
          {label}
        </Link>
      ) : (
        <span className="break-all">{imageId}</span>
      )}
      <Tooltip triggerEvent="hover" open={open}>
        <TooltipTrigger className="max-h-5" onMouseEnter={() => setHovered(true)} onFocus={() => setHovered(true)}>
          <span>
            <Icon
              icon="info"
              size="16"
              className="text-theme-light hover:text-theme-default cursor-pointer"
              aria-label={t`Resolve image name`}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="z-10 w-64 text-sm">{tooltipBody()}</TooltipContent>
      </Tooltip>
    </Stack>
  )
}
