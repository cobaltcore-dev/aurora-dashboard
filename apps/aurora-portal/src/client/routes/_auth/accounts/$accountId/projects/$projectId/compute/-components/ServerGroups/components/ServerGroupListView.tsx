import type { ServerGroup } from "@/server/Compute/types/serverGroup"
import { Icon } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

interface ServerGroupListViewProps {
  serverGroups: ServerGroup[]
}

export function ServerGroupListView({ serverGroups }: ServerGroupListViewProps) {
  // Helper function to format the creation date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  // Helper function to format policy with appropriate icon
  const renderPolicy = (policy: string | undefined) => {
    if (!policy) return <span>None</span>

    const policyIcons: Record<string, { icon: "danger" | "success" | "info"; color: string }> = {
      "anti-affinity": { icon: "danger", color: "jn-text-theme-danger" },
      affinity: { icon: "success", color: "jn-text-theme-success" },
      "soft-anti-affinity": { icon: "info", color: "jn-text-theme-warning" },
      "soft-affinity": { icon: "info", color: "jn-text-theme-info" },
    }

    const policyInfo = policyIcons[policy.toLowerCase()] || { icon: "info", color: "jn-text-theme-info" }

    return (
      <div className="flex items-center space-x-2">
        <Icon icon={policyInfo.icon} color={policyInfo.color} />
        <span>{policy}</span>
      </div>
    )
  }

  // Helper function to display members count with link
  const renderMembersCount = (group: ServerGroup) => {
    const count = group.members?.length || 0
    return <span className="font-medium">{count}</span>
  }

  return (
    <div>
      {serverGroups && serverGroups.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr>
                <th className="p-3">
                  <Trans>Group Name</Trans>
                </th>
                <th className="p-3">
                  <Trans>Policy</Trans>
                </th>
                <th className="p-3">
                  <Trans>Members</Trans>
                </th>
                <th className="p-3">
                  <Trans>Created</Trans>
                </th>
                <th className="flex justify-center p-3">
                  <Trans>Actions</Trans>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {serverGroups.map((group) => (
                <tr key={group.id}>
                  <td className="p-3">{group.name}</td>
                  <td className="p-3">{renderPolicy(group.policies?.[0])}</td>
                  <td className="p-3">{renderMembersCount(group)}</td>
                  <td className="p-3">{formatDate(group.created_at)}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>
          <Trans>No server groups available.</Trans>
        </p>
      )}
    </div>
  )
}
