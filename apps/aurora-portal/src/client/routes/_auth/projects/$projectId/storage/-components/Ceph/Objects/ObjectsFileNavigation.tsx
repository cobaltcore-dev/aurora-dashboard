import { Breadcrumb, BreadcrumbItem } from "@cloudoperators/juno-ui-components"
import { MdInventory2, MdOutlineInventory2, MdFolder, MdFolderOpen } from "react-icons/md"

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

// Active crumb gets a pill background to match the design — visually marks the current location.
const activeCrumbClass = "bg-theme-background-lvl-4 rounded px-2 py-0.5"

// ── ObjectsFileNavigation ─────────────────────────────────────────────────────

interface ObjectsFileNavigationProps {
  bucketName: string
  prefix: string
  onPrefixClick: (prefix: string) => void
}

export function ObjectsFileNavigation({ bucketName, prefix, onPrefixClick }: ObjectsFileNavigationProps) {
  const prefixSegments = prefixToSegments(prefix)

  // The last segment (deepest folder) is the active crumb — non-clickable.
  // All segments before it are clickable navigation targets.
  const isAtRoot = prefixSegments.length === 0

  return (
    <div className="mb-2 px-2 pt-2">
      <Breadcrumb>
        {/* Bucket name — inventory/box icon distinguishes it from folders;
            outlined when active (current root level), filled when navigable */}
        <BreadcrumbItem
          onClick={isAtRoot ? undefined : () => onPrefixClick("")}
          active={isAtRoot}
          label={
            (
              <span className={`flex items-center gap-1 ${isAtRoot ? activeCrumbClass : ""}`}>
                {isAtRoot ? (
                  <MdOutlineInventory2 size={15} className="shrink-0" />
                ) : (
                  <MdInventory2 size={15} className="shrink-0" />
                )}
                {bucketName}
              </span>
            ) as unknown as string
          }
        />

        {/* One crumb per prefix segment:
            - intermediate segments → MdFolder (filled, clickable)
            - last segment → MdFolderOpen (outlined, active/non-clickable) */}
        {prefixSegments.map((seg, i) => {
          const isLast = i === prefixSegments.length - 1
          return (
            <BreadcrumbItem
              key={seg.prefix}
              onClick={isLast ? undefined : () => onPrefixClick(seg.prefix)}
              active={isLast}
              label={
                (
                  <span className={`flex items-center gap-1 ${isLast ? activeCrumbClass : ""}`}>
                    {isLast ? (
                      <MdFolderOpen size={15} className="shrink-0" />
                    ) : (
                      <MdFolder size={15} className="shrink-0" />
                    )}
                    {seg.label}
                  </span>
                ) as unknown as string
              }
            />
          )
        })}
      </Breadcrumb>
    </div>
  )
}
