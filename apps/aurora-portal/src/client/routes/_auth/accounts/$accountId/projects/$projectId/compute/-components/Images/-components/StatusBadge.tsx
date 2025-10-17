import { Icon } from "@cloudoperators/juno-ui-components"

interface StatusBadgeProps {
  status: string | undefined
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return <span>Unknown</span>

  return (
    <div className="flex items-center space-x-2">
      {status === "active" ? (
        <Icon icon="success" color="jn-text-theme-success" data-testid="icon-success" />
      ) : status === "deleted" || status === "killed" ? (
        <Icon icon="danger" color="jn-text-theme-danger" data-testid="icon-danger" />
      ) : status === "queued" || status === "saving" || status === "importing" ? (
        <Icon icon="info" color="jn-text-theme-warning" data-testid="icon-waring" />
      ) : (
        <Icon icon="info" color="jn-text-theme-info" data-testid="icon-info" />
      )}
      <span>{status}</span>
    </div>
  )
}
