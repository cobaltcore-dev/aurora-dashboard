import type { Server } from "@/server/Compute/types/server"
import { Icon } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
type ServerListViewProps = {
  servers: Server[] | undefined
}

export function ServerListView({ servers }: ServerListViewProps) {
  const { t } = useLingui()
  return (
    <div>
      {servers && servers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            {/* Table Header */}
            <thead>
              <tr>
                <th className="p-3">{t`Server Name`}</th>
                <th className="p-3">{t`Status`}</th>
                <th className="p-3">{t`IPv4`}</th>
                <th className="p-3">{t`IPv6`}</th>
                <th className="p-3">{t`CPU`}</th>
                <th className="p-3">{t`RAM`}</th>
                <th className="p-3">{t`Disk`}</th>
                <th className="p-3 flex justify-center">{t`Actions`}</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>
          <Trans>No servers available.</Trans>
        </p>
      )}
    </div>
  )
}

export default ServerListView
