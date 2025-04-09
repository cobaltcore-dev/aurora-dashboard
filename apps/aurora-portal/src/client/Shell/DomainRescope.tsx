import { useParams } from "react-router-dom"

import { use, useEffect } from "react"
import { AuroraContext } from "../Shell/AuroraProvider"
import { TrpcClient } from "../trpcClient"
import { Domain } from "../../server/Authentication/types/models"
import { Project } from "../../server/Project/types/models"

export function DomainRescope({ children, client }: { children: React.ReactNode; client: TrpcClient["auth"] }) {
  const context = use(AuroraContext)
  const { domain } = useParams()

  useEffect(() => {
    if (domain !== context?.currentScope?.scope?.domain?.id) {
      client.setCurrentScope
        .mutate({ type: "domain", domainId: domain! })
        .then((data) => {
          context?.setCurrentScope({
            scope: { domain: data?.domain as Domain, project: data?.project as Project },
            isLoading: false,
          })
        })
        .catch((error) => context?.setCurrentScope({ error: error.message, isLoading: false }))
    }
  }, [domain])

  if (context?.currentScope?.isLoading)
    return <div className="h-full flex justify-center items-center text-gray-400">Rescoping domain...</div>

  if (context?.currentScope?.error)
    return (
      <div className="h-full flex justify-center items-center text-red-500">Error: {context?.currentScope?.error}</div>
    )
  return <>{children}</>
}
