// ServerGroups.tsx - Main component for server groups
import { TrpcClient } from "@/client/trpcClient"

import { ServerGroupListView } from "./components/ServerGroupListView"
import type { ServerGroup } from "@/server/Compute/types/serverGroup"
import { Suspense, use } from "react"

interface ServerGroupsContainerProps {
  getServerGroupsPromise: Promise<ServerGroup[] | undefined>
}

const ServerGroupsContainer = ({ getServerGroupsPromise }: ServerGroupsContainerProps) => {
  const serverGroups = use(getServerGroupsPromise)
  if (!serverGroups || serverGroups.length === 0) {
    return <p>No server groups available.</p>
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
    <Suspense fallback={<div className="p-4 text-center ">Loading server groups...</div>}>
      <ServerGroupsContainer getServerGroupsPromise={getServerGroupsPromise} />
    </Suspense>
  )
}
