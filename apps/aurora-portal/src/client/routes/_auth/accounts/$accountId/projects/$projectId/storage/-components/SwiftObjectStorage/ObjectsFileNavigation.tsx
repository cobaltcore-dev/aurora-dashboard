import { Breadcrumb, BreadcrumbItem } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

// ── Breadcrumb helpers ────────────────────────────────────────────────────────

/**
 * Splits the current prefix into navigable breadcrumb segments.
 * e.g. "a/b/c/" → [{ label: "a", prefix: "a/" }, { label: "b", prefix: "a/b/" }, { label: "c", prefix: "a/b/c/" }]
 */
function prefixToSegments(prefix: string): { label: string; prefix: string }[] {
  if (!prefix) return []
  // Remove trailing slash before splitting so we don't get a trailing empty segment
  const parts = prefix.replace(/\/$/, "").split("/").filter(Boolean)
  return parts.map((label, i) => ({
    label,
    prefix: parts.slice(0, i + 1).join("/") + "/",
  }))
}

// ── ObjectsFileNavigation ─────────────────────────────────────────────────────

interface ObjectsFileNavigationProps {
  containerName: string
  currentPrefix: string
  onContainersClick: () => void
  onPrefixClick: (prefix: string) => void
}

export const ObjectsFileNavigation = ({
  containerName,
  currentPrefix,
  onContainersClick,
  onPrefixClick,
}: ObjectsFileNavigationProps) => {
  const { t } = useLingui()

  const prefixSegments = prefixToSegments(currentPrefix)

  // The last segment (deepest folder) is the active crumb — non-clickable.
  // All segments before it are clickable navigation targets.
  const isAtRoot = prefixSegments.length === 0

  return (
    <div className="mb-2 px-2 pt-2">
      <Breadcrumb>
        {/* "All containers" root — always navigates back to the container list */}
        <BreadcrumbItem onClick={onContainersClick} label={t`All containers`} icon="dns" />

        {/* Container name — active when at root prefix, clickable otherwise */}
        <BreadcrumbItem
          onClick={isAtRoot ? undefined : () => onPrefixClick("")}
          active={isAtRoot}
          label={containerName}
          icon="autoAwesomeMosaic"
        />

        {/* One crumb per prefix segment, last one is active */}
        {prefixSegments.map((seg, i) => {
          const isLast = i === prefixSegments.length - 1
          return (
            <BreadcrumbItem
              key={seg.prefix}
              onClick={isLast ? undefined : () => onPrefixClick(seg.prefix)}
              active={isLast}
              label={seg.label}
            />
          )
        })}
      </Breadcrumb>
    </div>
  )
}
