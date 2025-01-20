import type { Server } from "../../shared/types/models"
import type { AuroraReactQueryRouter } from "../../polaris-bff/routers"

export default function Compute(props: { api: AuroraReactQueryRouter["compute"] }) {
  const { api } = props
  const { data, error, isLoading } = api.getServers.useQuery()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Compute</h2>
      <p>
        Servers:
        <ul>{data?.map((server: Server) => <li key={server.id}>{server.name}</li>)}</ul>
      </p>
    </div>
  )
}
