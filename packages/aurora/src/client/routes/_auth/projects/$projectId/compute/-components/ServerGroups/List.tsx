// ServerGroups.tsx - Main component for server groups
import { TrpcClient } from "@/client/trpcClient"
import { ServerGroupListView } from "./components/ServerGroupListView"
import type { ServerGroup } from "@/server/Compute/types/serverGroup"
import { Suspense, use } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Status } from "@cloudoperators/juno-ui-components/index"

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
  const getServerGroupsPromise = client.compute.getServerGroupsByProjectId.query({ project_id: project })

  return (
    <Suspense fallback={<Status status="progress" title={t`Loading Server Groups...`} />}>
      <ServerGroupsContainer getServerGroupsPromise={getServerGroupsPromise} />
    </Suspense>
  )
}
