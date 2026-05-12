import { createFileRoute, Outlet } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { CredentialPrompt } from "../-components/Ceph/Containers"
import { Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/ceph")({
  component: S3Layout,
})

function S3Layout() {
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { data: status, isLoading } = trpcReact.storage.ceph.containers.status.useQuery(
    { project_id: projectId ?? "" },
    { enabled: !!projectId }
  )

  if (isLoading) {
    return (
      <Stack direction="horizontal" gap="2" alignment="center" className="mt-8">
        <Spinner />
        <span className="text-juno-grey-light-1 text-sm">
          <Trans>Checking S3 credentials...</Trans>
        </span>
      </Stack>
    )
  }

  if (!status?.hasCredentials) {
    return (
      <CredentialPrompt
        onSuccess={async () => {
          await utils.storage.ceph.containers.status.refetch()
        }}
      />
    )
  }

  return <Outlet />
}
