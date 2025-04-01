import { useParams } from "wouter"

import { use, useEffect } from "react"
import { AuroraContext } from "../Shell/AuroraProvider"
import { TrpcClient } from "../trpcClient"

export function ProjectRescope({ children, client }: { children: React.ReactNode; client: TrpcClient["auth"] }) {
  const context = use(AuroraContext)
  const { projectId, domainId } = useParams()

  useEffect(() => {
    if (
      projectId !== context?.currentProject?.scope?.project?.id ||
      domainId !== context?.currentProject?.scope?.domain?.id
    ) {
      client.setCurrentScope
        .mutate({ domainId: domainId!, projectId: projectId || "" })
        .then((data) => {
          context?.setCurrentProject({ scope: { domain: data.domain, project: data.project }, isLoading: false })
        })
        .catch((error) => context?.setCurrentProject({ error: error.message, isLoading: false }))
    }
  }, [projectId, domainId])

  if (context?.currentProject?.isLoading)
    return <div className="h-full flex justify-center items-center text-gray-400">Rescoping...</div>

  if (context?.currentProject?.error)
    return (
      <div className="h-full flex justify-center items-center text-red-500">
        Error: {context?.currentProject?.error}
      </div>
    )
  return <>{children}</>
}
