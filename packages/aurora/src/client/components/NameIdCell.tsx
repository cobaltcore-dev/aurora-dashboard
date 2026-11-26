import { type ReactNode } from "react"
import { Stack } from "@cloudoperators/juno-ui-components"
import ClipboardText from "@/client/components/ClipboardText"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"

interface NameIdCellProps {
  /** Display name; when empty the "- -" placeholder is shown and the ID becomes the link target. */
  name: string | null | undefined
  /** Resource ID, always shown beneath the name with a copy affordance. */
  id: string
  /**
   * Wraps the given text in a link to the resource's detail page. Omit for a non-linked cell.
   * Keeps TanStack Router's typed `to`/`params` at the call site; apply `NAME_ID_LINK_CLASS`
   * to the Link, e.g.
   * `renderLink={(text) => <Link to="…/$portId" params={{ projectId, portId: id }} className={NAME_ID_LINK_CLASS}>{text}</Link>}`.
   */
  renderLink?: (text: string) => ReactNode
}

/** Shared link styling for the name/ID cross-links: default text color, underline on hover. */
export const NAME_ID_LINK_CLASS = "text-inherit break-all hover:underline"

/**
 * The shared "Name / ID" cell used across list and sub-table views: the name on top with the
 * ID beneath as a subdued copy affordance. When `renderLink` is provided the name links to the
 * resource (a cross-link); if the name is empty, the placeholder shows and the ID line becomes
 * the link instead, keeping its copy affordance (revealed on hover over the whole line).
 */
export const NameIdCell = ({ name, id, renderLink }: NameIdCellProps) => {
  const displayName = name?.trim()

  // Not linkable: name (or placeholder) + copyable ID beneath.
  if (!renderLink) {
    return (
      <Stack direction="vertical" gap="0.5" className="min-w-0">
        <span className="break-all">{displayName || EMPTY_VALUE}</span>
        <ClipboardText text={id} className="text-theme-light text-sm" />
      </Stack>
    )
  }

  // Named: the name links to the detail page, copyable ID beneath.
  if (displayName) {
    return (
      <Stack direction="vertical" gap="0.5" className="min-w-0">
        {renderLink(displayName)}
        <ClipboardText text={id} className="text-theme-light text-sm" />
      </Stack>
    )
  }

  // No name: "- -" placeholder, with the ID line linking to the detail page. The `group` wrapper
  // reveals the copy icon on hover over the whole line (ID included), not just the icon.
  return (
    <Stack direction="vertical" gap="0.5" className="min-w-0">
      <span className="break-all">{EMPTY_VALUE}</span>
      <Stack direction="horizontal" gap="1" className="group text-theme-light min-w-0 items-center text-sm">
        {renderLink(id)}
        <ClipboardText text={id} iconOnly revealOnGroupHover />
      </Stack>
    </Stack>
  )
}
