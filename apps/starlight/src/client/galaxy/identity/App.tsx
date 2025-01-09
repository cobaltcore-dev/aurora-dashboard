import React, { useEffect } from "react"
import type { ExtensionProps } from "../../../shared/types/extension"
import type { User } from "../../../shared/types/models"

export default function Compute({ client }: ExtensionProps) {
  const [result, setResult] = React.useState<User[] | null>(null)

  useEffect(() => {
    client.identity.users.list.query().then((res: User[]) => {
      setResult(res)
    })
  }, [])
  return (
    <div>
      <h2>Identity</h2>
      <p>
        Users:
        <ul>{result?.map((user: User) => <li key={user.id}>{user.name}</li>)}</ul>
      </p>
    </div>
  )
}
