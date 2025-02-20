import type { Server } from "../../../shared/types/models"
import { Button, Icon } from "@cloudoperators/juno-ui-components"

type ServerListViewProps = {
  servers: Server[] | undefined
}

export function ServerListView({ servers }: ServerListViewProps) {
  return (
    <div>
      {servers && servers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-[#30363d] text-gray-300">
            {/* Table Header */}
            <thead className="bg-[#21262d]">
              <tr className="text-gray-400 border-b border-[#30363d]">
                <th className="p-3">Server Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">IPv4</th>
                <th className="p-3">IPv6</th>
                <th className="p-3">CPU</th>
                <th className="p-3">RAM</th>
                <th className="p-3">Disk</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {servers.map((server, index) => (
                <tr
                  key={server.id}
                  className={`hover:bg-[#1e2531] ${index !== servers.length - 1 ? "border-b border-[#30363d]" : ""}`}
                >
                  <td className="p-3">{server.name}</td>

                  {/* Status with Icon */}
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      {server.status === "ACTIVE" ? (
                        <Icon name="success" icon="success" color="jn-text-theme-success" />
                      ) : server.status === "SHUTOFF" ? (
                        <Icon name="danger" icon="danger" color="jn-text-theme-danger" />
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
                  <td className="p-3">{server.flavor.vcpus}</td>
                  <td className="p-3">{server.flavor.ram} MB</td>
                  <td className="p-3">{server.flavor.disk} GB</td>

                  {/* Action Buttons */}
                  <td className="p-3">
                    <div className="flex space-x-2">
                      <Button variant="primary" size="small">
                        View
                      </Button>
                      <Button variant="primary-danger" size="small">
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
        <p className="text-gray-400">No servers available.</p>
      )}
    </div>
  )
}

export default ServerListView
