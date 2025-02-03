import type { Server } from "../../shared/types/models"
import type { AuroraReactQueryRouter } from "../../polaris-bff/routers"
import { Key } from "react"

export default function Compute(props: { api: AuroraReactQueryRouter["compute"] }) {
  const { api } = props
  const { data, error, isLoading } = api.getServers.useQuery()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Compute</h2>
      Servers:
      <ul>{data?.map((server: Server, i: Key | null | undefined) => <li key={i}>{server.name}</li>)}</ul>
    </div>
  )
}
