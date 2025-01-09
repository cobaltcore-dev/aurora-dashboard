import React, { useEffect } from "react"
import type { ExtensionProps } from "../../../shared/types/extension"
import type { Server } from "../../../shared/types/models"

export default function Compute({ client }: ExtensionProps) {
  const [result, setResult] = React.useState<Server[] | null>(null)

  useEffect(() => {
    client.compute.servers.list.query().then((res: Server[]) => {
      setResult(res)
    })
  }, [])
  return (
    <div>
      <h2>Compute</h2>
      <p>
        Servers:
        <ul>{result?.map((server: Server) => <li key={server.id}>{server.name}</li>)}</ul>
      </p>
    </div>
  )
}
