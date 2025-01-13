import type { User } from "../../shared/types/models"
import { trpc } from "../trpcClient"

export default function Compute() {
  const userQuery = trpc.identity.getUsers.useQuery()

  return (
    <div>
      <h2>Identity</h2>
      <p>
        Users:
        <ul>{userQuery.data?.map((user: User) => <li key={user.id}>{user.name}</li>)}</ul>
      </p>
    </div>
  )
}
