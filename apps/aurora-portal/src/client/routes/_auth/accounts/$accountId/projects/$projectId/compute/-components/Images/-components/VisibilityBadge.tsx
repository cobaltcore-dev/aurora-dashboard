import { Icon } from "@cloudoperators/juno-ui-components"

interface VisibilityBadgeProps {
  visibility: string | undefined
}

export function VisibilityBadge({ visibility }: VisibilityBadgeProps) {
  if (!visibility) return <span>Unknown</span>

  return (
    <div className="flex items-center space-x-2">
      {visibility === "public" ? (
        <Icon icon="info" color="jn-text-theme-info" data-testid="icon-info" />
      ) : visibility === "private" ? (
        <Icon icon="info" color="jn-text-theme-warning" data-testid="icon-warning" />
      ) : visibility === "shared" ? (
        <Icon icon="info" color="jn-text-theme-success" data-testid="icon-success" />
      ) : (
        <span>{visibility}</span>
      )}
      <span>{visibility}</span>
    </div>
  )
}
