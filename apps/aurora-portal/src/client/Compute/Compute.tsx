import type { Server } from "../../shared/types/models"
import { trpc } from "../trpcClient"

export default function Compute() {
  const serversQuery = trpc.compute.getServers.useQuery()

  return (
    <div>
      <h2>Compute</h2>
      <p>
        Servers:
        <ul>{serversQuery.data?.map((server: Server) => <li key={server.id}>{server.name}</li>)}</ul>
      </p>
    </div>
  )
}
