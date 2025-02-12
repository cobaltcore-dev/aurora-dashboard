import { useEffect, useState } from "react"
import type { Server } from "../../shared/types/models"
import { TrpcClient } from "../trpcClient"

type GetServersState = {
  data?: Server[]
  error?: string
  isLoading?: boolean
}

export default function Compute({ api }: { api: TrpcClient["compute"] }) {
  const [getServers, updateGetServer] = useState<GetServersState>({ isLoading: true })

  useEffect(() => {
    api.getServers
      .query()
      .then((data) => {
        updateGetServer({ data, isLoading: false, error: undefined })
      })
      .catch((error) => {
        updateGetServer({ error: error.message, isLoading: false })
      })
  }, [])

  if (getServers.isLoading) return <div>Loading...</div>
  if (getServers.error) return <div>Error: {getServers.error}</div>

  return (
    <div>
      <h2>Compute</h2>
      Servers:
      <ul>{getServers.data?.map((server, i) => <li key={i}>{server.name}</li>)}</ul>
    </div>
  )
}
