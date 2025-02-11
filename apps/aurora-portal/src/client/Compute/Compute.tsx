import { useEffect, useState } from "react"
import type { Server } from "../../shared/types/models"
import { trpcClient } from "../../client/trpcClient"

type GetServersState = {
  data?: Server[]
  error?: string
  isLoading?: boolean
}

export default function Compute() {
  const [getServers, updateGetServer] = useState<GetServersState>({ isLoading: true })

  useEffect(() => {
    trpcClient.compute.getServers
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
