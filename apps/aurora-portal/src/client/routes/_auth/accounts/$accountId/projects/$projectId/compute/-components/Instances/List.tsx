import ServerCardView from "./-components/ServerCardView"
import ServerListView from "./-components/ServerListView"
import { Suspense, use } from "react"
import { Server } from "@/server/Compute/types/server"
import { TrpcClient } from "@/client/trpcClient"
import { Button } from "@cloudoperators/juno-ui-components/index"
import { Trans } from "@lingui/react/macro"

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
  const getServersPromise = client.compute.getServersByProjectId.query({ projectId: project })

  return (
    <Suspense
      fallback={
        <div className="p-4 text-center ">
          <Trans>Loading instances...</Trans>
        </div>
      }
    >
      <Button
        onClick={async () => {
          const canList = await client.compute.canUser.query("servers:list")
          alert(`Permission to list instances: ${canList ? "Granted" : "Denied"}`)
        }}
      >
        Can List Instances
      </Button>
      <InstanceContainer getServersPromise={getServersPromise} viewMode={viewMode} />
    </Suspense>
  )
}
