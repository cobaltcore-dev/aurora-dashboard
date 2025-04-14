import { ToastProps, auroraToast, sonnerToast } from "../../../../../../../../../Shell/NotificationCenter/AuroraToast"
import type { ServerGroup } from "../../../../../../../../../../server/Compute/types/serverGroup"
import { Button } from "../../../../../../../../../components/Button"
import { Icon } from "../../../../../../../../../components/Icon"

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
        <Icon name={policyInfo.icon} color={policyInfo.color} />
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
          <table className="w-full text-left border-collapse border border-[#30363d] text-gray-300">
            {/* Table Header */}
            <thead className="bg-[#21262d]">
              <tr className="text-gray-400 border-b border-[#30363d]">
                <th className="p-3">Group Name</th>
                <th className="p-3">Policy</th>
                <th className="p-3">Members</th>
                <th className="p-3">Created</th>
                <th className="p-3 flex justify-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {serverGroups.map((group, index) => (
                <tr
                  key={group.id}
                  className={`hover:bg-[#1e2531] ${index !== serverGroups.length - 1 ? "border-b border-[#30363d]" : ""}`}
                >
                  <td className="p-3">{group.name}</td>
                  <td className="p-3">{renderPolicy(group.policies?.[0])}</td>
                  <td className="p-3">{renderMembersCount(group)}</td>
                  <td className="p-3">{formatDate(group.created_at)}</td>

                  {/* Action Buttons */}
                  <td className="p-3">
                    <div className="flex space-x-3 justify-end">
                      <Button
                        className="hover:bg-gray-600"
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "Group Details",
                            description: `Viewing details for server group "${group.name}"`,
                            variant: "info",
                            button: {
                              label: "Close",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Details
                      </Button>
                      <Button
                        variant="success"
                        className="hover:bg-gray-600"
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "Launch Instance",
                            description: `Launch instance in server group "${group.name}"`,
                            variant: "success",
                            button: {
                              label: "Dismiss",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Launch
                      </Button>
                      <Button
                        variant="primary-danger"
                        className="hover:bg-red-500"
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "Delete Server Group",
                            description: `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
                            variant: "error",
                            button: {
                              label: "Cancel",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400">No server groups available.</p>
      )}
    </div>
  )
}
