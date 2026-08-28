import ServerCardView from "./-components/ServerCardView"
import ServerListView from "./-components/ServerListView"
import { Suspense, use } from "react"
import { Server } from "@/server/Compute/types/server"
import { TrpcClient } from "@/client/trpcClient"
import { Status } from "@cloudoperators/juno-ui-components/index"
import { useLingui } from "@lingui/react/macro"

interface InstanceContainerProps {
  getServersPromise: Promise<Server[] | undefined>
  viewMode: string
}

const InstanceContainer = ({ getServersPromise, viewMode }: InstanceContainerProps) => {
  const servers = use(getServersPromise)

  if (!servers) return <div className="p-4 text-center">No instances found</div>

  return viewMode === "list" ? <ServerListView servers={servers} /> : <ServerCardView servers={servers} />
}

export const Instances = ({
  client,
  project,
  viewMode,
}: {
  project: string
  client: TrpcClient
  viewMode: "list" | "card"
}) => {
  const { t } = useLingui()
  const getServersPromise = client.compute.getServersByProjectId.query({ project_id: project })

  return (
    <Suspense fallback={<Status status="progress" title={""} body={t`Loading Instances...`} />}>
      <InstanceContainer getServersPromise={getServersPromise} viewMode={viewMode} />
    </Suspense>
  )
}
