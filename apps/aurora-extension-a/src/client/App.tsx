import React, { useEffect } from "react"
import { TrpcClient } from "../client/trpcClient"
import { Entity } from "../server/routers/entityRouter"

// Define the props for the component
export interface ExtensionProps {
  client: TrpcClient
}

export default function App({ client }: ExtensionProps) {
  const [result, setResult] = React.useState<Entity[] | null>(null)

  useEffect(() => {
    client.extensionA.entities.list.query().then((res: Entity[]) => {
      setResult(res)
    })
  }, [])
  return (
    <div>
      <h2>Starlight Mars</h2>
      <p>
        Entities:
        <ul>{result?.map((entity: Entity) => <li key={entity.id}>{entity.name}</li>)}</ul>
      </p>
    </div>
  )
}
