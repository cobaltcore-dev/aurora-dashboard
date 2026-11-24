import { Link } from "@tanstack/react-router"
import { Stack } from "@cloudoperators/juno-ui-components"
import ClipboardText from "@/client/components/ClipboardText"

export type SharedFileSystemLinkTarget = "share" | "shareNetwork" | "snapshot" | "network"
export const ID_LINK_TRUNCATE_AT = 13

/**
 * ID-only deep-link with no API call or name lookup (E2).
 * When linkable=false, degrades to a plain copyable ID.
 * Callers render "- -" themselves when the ID is missing.
 */
export function SharedFileSystemIdLink({
  target,
  id,
  projectId,
  linkable = true,
}: {
  target: SharedFileSystemLinkTarget
  id: string
  projectId: string
  linkable?: boolean
}) {
  if (!linkable) {
    return <ClipboardText text={id} truncateAt={ID_LINK_TRUNCATE_AT} />
  }

  const label = id.length > ID_LINK_TRUNCATE_AT ? `${id.slice(0, ID_LINK_TRUNCATE_AT)}...` : id

  let link: React.ReactNode

  switch (target) {
    case "share":
      link = (
        <Link
          to="/projects/$projectId/shared-file-system/$shareId"
          params={{ projectId, shareId: id }}
          className="text-theme-link hover:text-theme-default"
        >
          {label}
        </Link>
      )
      break
    case "shareNetwork":
      link = (
        <Link
          to="/projects/$projectId/shared-file-system/share-networks/$shareNetworkId"
          params={{ projectId, shareNetworkId: id }}
          className="text-theme-link hover:text-theme-default"
        >
          {label}
        </Link>
      )
      break
    case "snapshot":
      link = (
        <Link
          to="/projects/$projectId/shared-file-system/snapshots/$snapshotId"
          params={{ projectId, snapshotId: id }}
          className="text-theme-link hover:text-theme-default"
        >
          {label}
        </Link>
      )
      break
    case "network":
      link = (
        <Link
          to="/projects/$projectId/network/networks/$networkId"
          params={{ projectId, networkId: id }}
          className="text-theme-link hover:text-theme-default"
        >
          {label}
        </Link>
      )
      break
  }

  // Copy affordance sits beside the link, not inside the anchor (I12)
  return (
    <Stack direction="horizontal" gap="1" className="min-w-0 items-center">
      {link}
      <ClipboardText text={id} iconOnly />
    </Stack>
  )
}
