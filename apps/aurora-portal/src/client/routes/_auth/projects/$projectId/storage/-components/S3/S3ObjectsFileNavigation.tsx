import { Breadcrumb, BreadcrumbItem } from "@cloudoperators/juno-ui-components"

interface S3ObjectsFileNavigationProps {
  bucketName: string
  prefix: string
  onPrefixClick: (prefix: string) => void
}

// Convert "a/b/c/" → [{label: "a", prefix: "a/"}, {label: "b", prefix: "a/b/"}, ...]
function prefixToSegments(prefix: string): Array<{ label: string; prefix: string }> {
  if (!prefix) return []
  const parts = prefix.split("/").filter(Boolean)
  return parts.map((part, idx) => ({
    label: part,
    prefix: parts.slice(0, idx + 1).join("/") + "/",
  }))
}

export function S3ObjectsFileNavigation({ bucketName, prefix, onPrefixClick }: S3ObjectsFileNavigationProps) {
  const segments = prefixToSegments(prefix)

  return (
    <Breadcrumb>
      <BreadcrumbItem label={bucketName} onClick={() => onPrefixClick("")} />

      {segments.map((segment, idx) => {
        const isLast = idx === segments.length - 1
        return (
          <BreadcrumbItem
            key={segment.prefix}
            label={segment.label}
            onClick={isLast ? undefined : () => onPrefixClick(segment.prefix)}
          />
        )
      })}
    </Breadcrumb>
  )
}
