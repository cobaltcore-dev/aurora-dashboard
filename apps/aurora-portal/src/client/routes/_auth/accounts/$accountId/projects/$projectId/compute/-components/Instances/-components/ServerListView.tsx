import { ToastProps, auroraToast, sonnerToast } from "@/client/components/NotificationCenter/AuroraToast"
import type { Server } from "@/server/Compute/types/server"
import { Button } from "@cloudoperators/juno-ui-components"
import { Icon } from "@cloudoperators/juno-ui-components"
type ServerListViewProps = {
  servers: Server[] | undefined
}

export function ServerListView({ servers }: ServerListViewProps) {
  return (
    <div>
      {servers && servers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            {/* Table Header */}
            <thead>
              <tr>
                <th className="p-3">Server Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">IPv4</th>
                <th className="p-3">IPv6</th>
                <th className="p-3">CPU</th>
                <th className="p-3">RAM</th>
                <th className="p-3">Disk</th>
                <th className="p-3 flex justify-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {servers.map((server) => (
                <tr key={server.id}>
                  <td className="p-3">{server.name}</td>

                  {/* Status with Icon */}
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      {server.status === "ACTIVE" ? (
                        <Icon icon="success" data-testid="icon-success" color="text-theme-success" />
                      ) : server.status === "SHUTOFF" ? (
                        <Icon icon="danger" data-testid="icon-danger" color="text-theme-danger" />
                      ) : (
                        <p>{server.status}</p>
                      )}
                      <span>{server.status}</span>
                    </div>
                  </td>

                  {/* Network Info */}
                  <td className="p-3">{server.accessIPv4 || "N/A"}</td>
                  <td className="p-3">{server.accessIPv6 || "N/A"}</td>

                  {/* Resource Details */}
                  <td className="p-3">{server?.flavor?.vcpus}</td>
                  <td className="p-3">{server?.flavor?.ram} MB</td>
                  <td className="p-3">{server?.flavor?.disk} GB</td>

                  {/* Action Buttons */}
                  <td className="p-3">
                    {/* Action Buttons */}
                    <div className=" flex space-x-3 justify-end mt-4">
                      <Button
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "All great you are awesome",
                            description: "Is this not amazing folks?",
                            variant: "success",
                            button: {
                              label: "Dismiss",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Create
                      </Button>
                      <Button
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "All ok you are good",
                            description: "It is info",
                            variant: "info",
                            button: {
                              label: "Dismiss",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        View
                      </Button>
                      <Button
                        variant="primary-danger"
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "This is a danger error",
                            description: "You are on a bad side check logs",
                            variant: "error",
                            button: {
                              label: "Check",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Restart
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No servers available.</p>
      )}
    </div>
  )
}

export default ServerListView
