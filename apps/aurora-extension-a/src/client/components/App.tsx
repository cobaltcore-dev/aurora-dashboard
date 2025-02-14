import React, { useEffect } from "react"
import { TrpcClient } from "../../client/trpcClient"
import { Entity } from "../../server/types/models"

// Define the props for the component
export interface ExtensionProps {
  client: TrpcClient
}

export const App = ({ client }: ExtensionProps) => {
  const [result, setResult] = React.useState<Entity[] | null>(null)

  useEffect(() => {
    client.entities.list.query().then((res: Entity[]) => {
      setResult(res)
    })
  }, [])
  return (
    <div>
      <h2>Starlight Mars</h2>
      <div>
        Entities:
        <ul>{result?.map((entity: Entity) => <li key={entity.id}>{entity.name}</li>)}</ul>
      </div>
    </div>
  )
}
