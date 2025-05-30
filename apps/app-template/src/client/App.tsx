import { useEffect, useState } from "react"
import { TrpcClient } from "./trpcClient"
import type { Entity } from "../bff/types/models"

export interface AppProps {
  baseUrl: string
  trpcClient: TrpcClient
}

export function App({ trpcClient }: AppProps) {
  const [items, setItems] = useState<Entity[]>([])
  useEffect(() => {
    // Initialize the TRPC client
    trpcClient.entities.list
      .query()
      .then((data) => {
        console.log("Entities:", data)
        setItems(data as Entity[])
      })
      .catch((error) => {
        console.error("Error fetching entities:", error)
      })
  }, [])
  return (
    <div className="flex flex-col w-full bg-theme-background-lvl-1">
      <h1>Aurora Extension Template</h1>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.id}: {item.name}
          </li>
        ))}
      </ul>
      {/* Add more components or content here */}
    </div>
  )
}
