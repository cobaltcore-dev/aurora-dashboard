import React, { useEffect } from "react"
import type { ExtensionProps } from "../shared/types/extension"
import type { Entity } from "../shared/types/models"

export default function App({ client }: ExtensionProps) {
  const [result, setResult] = React.useState<Entity[] | null>(null)

  useEffect(() => {
    client.entities.list.query().then((res: Entity[]) => {
      setResult(res)
    })
  }, [])
  return (
    <div>
      <h2>Starlight Jupiter</h2>
      <p>
        Entities:
        <ul>{result?.map((entity: Entity) => <li key={entity.id}>{entity.name}</li>)}</ul>
      </p>
    </div>
  )
}
