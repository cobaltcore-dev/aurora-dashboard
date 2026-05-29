import type { Server } from "@/server/Compute/types/server"
import { Pill } from "@cloudoperators/juno-ui-components"
import { Button } from "@cloudoperators/juno-ui-components"
import { Icon } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
type ServerListViewProps = {
  servers: Server[] | undefined
}

type ServerCardProps = {
  server: Server
}

export function ServerCard({ server }: ServerCardProps) {
  return (
    <div className="flex flex-col items-start space-y-4 rounded-xl border border-[#30363d] bg-[#161b22] p-5 text-gray-300 shadow-lg">
      {/* Server Name */}
      <h3 className="text-xl font-semibold text-white">{server.name}</h3>

      {/* Status with Icon */}
      <div className="flex items-center space-x-2">
        {server.status === "ACTIVE" ? (
          <Icon icon="success" data-testid="icon-success" color="jn-text-theme-success" />
        ) : server.status === "SHUTOFF" ? (
          <Icon icon="danger" data-testid="icon-danger" color="jn-text-theme-danger" />
        ) : (
          <p>{server.status}</p>
        )}
        <span className="font-medium">{server.status}</span>
      </div>

      {/* Server Details */}
      <Pill pillKeyLabel="IPv4:" pillValue={server.accessIPv4 || "N/A"} />
      <Pill pillKeyLabel="IPv6:" pillValue={server.accessIPv6 || "N/A"} />
      <Pill pillKeyLabel="CPU:" pillValue={server?.flavor?.vcpus ? server.flavor.vcpus.toString() : "N/A"} />
      <Pill pillKeyLabel="RAM:" pillValue={server?.flavor?.vcpus ? `${server?.flavor?.ram} MB` : "N/A"} />
      <Pill pillKeyLabel="Disk:" pillValue={server?.flavor?.disk ? `${server?.flavor?.disk} GB` : "N/A"} />

      {/* Server Metadata */}
      <p className="text-sm">
        <Trans>Server Role:</Trans> {server?.metadata?.["Server Role"] ?? "Unknown Role"}
      </p>

      {/* Action Buttons */}
      <div className="mt-4 flex space-x-3">
        <Button>
          <Trans>View Details</Trans>
        </Button>
        <Button variant="primary-danger">
          <Trans>Restart</Trans>
        </Button>
      </div>
    </div>
  )
}

export function ServerCardView({ servers }: ServerListViewProps) {
  return (
    <div className="mx-auto h-full w-full max-w-[95vw]">
      {/* Adaptive Grid */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {servers?.length ? (
          servers.map((server) => <ServerCard key={server.id} server={server} />)
        ) : (
          <p className="col-span-full text-center text-gray-400">No servers available.</p>
        )}
      </div>
    </div>
  )
}

export default ServerCardView
