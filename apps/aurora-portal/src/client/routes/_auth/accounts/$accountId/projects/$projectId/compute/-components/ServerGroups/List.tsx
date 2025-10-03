// ServerGroups.tsx - Main component for server groups
import { TrpcClient } from "@/client/trpcClient"
import { ServerGroupListView } from "./components/ServerGroupListView"
import type { ServerGroup } from "@/server/Compute/types/serverGroup"
import { Suspense, use } from "react"
import { Trans } from "@lingui/react/macro"

interface ServerGroupsContainerProps {
  getServerGroupsPromise: Promise<ServerGroup[] | undefined>
}

const ServerGroupsContainer = ({ getServerGroupsPromise }: ServerGroupsContainerProps) => {
  const serverGroups = use(getServerGroupsPromise)
  if (!serverGroups || serverGroups.length === 0) {
    return <Trans>No server groups available.</Trans>
  }

  return <ServerGroupListView serverGroups={serverGroups} />
}

interface ServerGroupsProps {
  client: TrpcClient
  project: string
}

export function ServerGroups({ client, project }: ServerGroupsProps) {
  const getServerGroupsPromise = client.compute.getServerGroupsByProjectId.query({ projectId: project })

  return (
    <Suspense
      fallback={
        <div className="p-4 text-center ">
          <Trans>Loading server groups...</Trans>
        </div>
      }
    >
      <ServerGroupsContainer getServerGroupsPromise={getServerGroupsPromise} />
    </Suspense>
  )
}
