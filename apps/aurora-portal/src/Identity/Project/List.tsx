import React from "react"
// @ts-expect-error types will be provided soon
import { Message } from "@cloudoperators/juno-ui-components"

import { useListAuthProjectsLazyQuery } from "../../generated/graphql"

export function ProjectList() {
  const [getProjects, { data, loading, error }] = useListAuthProjectsLazyQuery()

  React.useEffect(() => {
    getProjects()
  }, [getProjects])

  return (
    <div>
      <h1>Project List</h1>
      {loading && <p>Loading...</p>}
      {error && (
        <Message heading="Error" variant="error">
          Error: {error.message}
        </Message>
      )}
      <button onClick={() => getProjects()}>Refresh</button>
      {data?.listAuthProjects.map((project) => (
        <div key={project.id}>
          <h2>{project.name}</h2>
          <p>{project.description}</p>
          <p>Domain: {project.domain.id}</p>
          <p>Enabled: {project.enabled ? "Yes" : "No"}</p>
        </div>
      ))}
    </div>
  )
}
