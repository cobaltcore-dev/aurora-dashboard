import type { Server } from "../../../server/Compute/types/models"
import { Pill, Icon } from "@cloudoperators/juno-ui-components"
import { Button } from "../../components/Button"

type ServerListViewProps = {
  servers: Server[] | undefined
}

type ServerCardProps = {
  server: Server
}

export function ServerCard({ server }: ServerCardProps) {
  return (
    <div className="bg-[#161b22] rounded-xl shadow-lg p-5 flex flex-col items-start space-y-4 border border-[#30363d] text-gray-300">
      {/* Server Name */}
      <h3 className="text-xl font-semibold text-white">{server.name}</h3>

      {/* Status with Icon */}
      <div className="flex items-center space-x-2">
        {server.status === "ACTIVE" ? (
          <Icon name="success" icon="success" color="jn-text-theme-success" />
        ) : server.status === "SHUTOFF" ? (
          <Icon name="danger" icon="danger" color="jn-text-theme-danger" />
        ) : (
          <p>{server.status}</p>
        )}
        <span className="font-medium">{server.status}</span>
      </div>

      {/* Server Details */}
      <Pill
        pillKey="IPv4"
        pillKeyLabel="IPv4:"
        pillValueLabel={server.accessIPv4 || "N/A"}
        pillValue={server.accessIPv4 || "N/A"}
      />
      <Pill
        pillKey="IPv6"
        pillKeyLabel="IPv6:"
        pillValueLabel={server.accessIPv6 || "N/A"}
        pillValue={server.accessIPv6 || "N/A"}
      />
      <Pill
        pillKey="CPU"
        pillKeyLabel="CPU:"
        pillValueLabel={server.flavor.vcpus.toString()}
        pillValue={server.flavor.vcpus.toString()}
      />
      <Pill
        pillKey="RAM"
        pillKeyLabel="RAM:"
        pillValueLabel={`${server.flavor.ram} MB`}
        pillValue={`${server.flavor.ram} MB`}
      />
      <Pill
        pillKey="Disk"
        pillKeyLabel="Disk:"
        pillValueLabel={`${server.flavor.disk} GB`}
        pillValue={`${server.flavor.disk} GB`}
      />

      {/* Server Metadata */}
      <p className="text-sm">Server Role: {server.metadata["Server Role"] || "Unknown Role"}</p>

      {/* Action Buttons */}
      <div className="flex space-x-3 mt-4">
        <Button className="bg-gray-700 hover:bg-gray-600">View Details</Button>
        <Button className="bg-red-600 hover:bg-red-500">Restart</Button>
      </div>
    </div>
  )
}

export function ServerCardView({ servers }: ServerListViewProps) {
  return (
    <div className="h-full w-full max-w-[95vw] mx-auto">
      {/* Adaptive Grid */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {servers?.length ? (
          servers.map((server) => <ServerCard key={server.id} server={server} />)
        ) : (
          <p className="text-gray-400 text-center col-span-full">No servers available.</p>
        )}
      </div>
    </div>
  )
}

export default ServerCardView
