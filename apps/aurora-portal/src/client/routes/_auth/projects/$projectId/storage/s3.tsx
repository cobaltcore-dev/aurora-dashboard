import { createFileRoute, Outlet } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { S3CredentialPrompt } from "./-components/S3/S3CredentialPrompt"
import { Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/s3")({
  component: S3Layout,
})

function S3Layout() {
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { data: status, isLoading } = trpcReact.storage.s3.buckets.status.useQuery(
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
      <S3CredentialPrompt
        onSuccess={async () => {
          await utils.storage.s3.buckets.status.refetch()
        }}
      />
    )
  }

  return <Outlet />
}
