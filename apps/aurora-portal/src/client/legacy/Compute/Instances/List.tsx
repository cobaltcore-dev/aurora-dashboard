import { Server } from "../../../../server/Compute/types/server"
import ServerCardView from "./components/ServerCardView"
import ServerListView from "./components/ServerListView"
import { useParams } from "react-router-dom"
import { TrpcClient } from "../../../trpcClient"
import { Suspense, use } from "react"

interface InstanceContainerProps {
  getServersPromise: Promise<Server[] | undefined>
  viewMode: string
}

const InstanceContainer = ({ getServersPromise, viewMode }: InstanceContainerProps) => {
  const servers = use(getServersPromise)

  if (!servers) return <div className="p-4 text-center text-gray-400">No instances found</div>

  return viewMode === "list" ? <ServerListView servers={servers} /> : <ServerCardView servers={servers} />
}

export const Instances = ({ client, viewMode }: { client: TrpcClient; viewMode: "list" | "card" }) => {
  const { project } = useParams()
  if (!project) return "Loading..."
  const getServersPromise = client.compute.getServersByProjectId.query({ projectId: project })

  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-400">Loading instances...</div>}>
      <InstanceContainer getServersPromise={getServersPromise} viewMode={viewMode} />
    </Suspense>
  )
}
