import type { User } from "../../../shared/types/models"
import type { AuroraReactQueryRouter } from "../../../polaris-bff/routers"

export default function Projects(props: { api: AuroraReactQueryRouter["identity"] }) {
  const { api } = props
  const { data, error, isLoading } = api.getUsers.useQuery()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Identity</h2>
      <p>
        Users:
        <ul>{data?.map((user: User) => <li key={user.id}>{user.name}</li>)}</ul>
      </p>
    </div>
  )
}
