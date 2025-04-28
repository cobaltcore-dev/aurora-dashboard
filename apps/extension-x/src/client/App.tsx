import { useEffect, useState } from "react"
import { TrpcClient, trpcClient } from "./trpcClient"

interface Item {
  id: number
  name: string
}
export function App() {
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => {
    // Initialize the TRPC client
    trpcClient.entities.list
      .query()
      .then((data) => {
        console.log("Entities:", data)
        setItems(data)
      })
      .catch((error) => {
        console.error("Error fetching entities:", error)
      })
  }, [])
  return (
    <div className="flex flex-col w-full bg-theme-background-lvl-1">
      <h1>Extension X</h1>
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
  // Default navigation items
}
