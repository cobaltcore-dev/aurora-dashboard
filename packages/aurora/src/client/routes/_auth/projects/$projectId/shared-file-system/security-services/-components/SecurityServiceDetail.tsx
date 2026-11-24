import { useLingui } from "@lingui/react/macro"
import { Status } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { SharedFileSystemDetailLoadError } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/SharedFileSystemDetailLoadError"
import { getSecurityServiceDisplayName } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/securityServiceUtils"
import { SecurityServiceDetailsView } from "./SecurityServiceDetailsView"

interface SecurityServiceLoadErrorProps {
  error: unknown
  onRetry: () => void
}

export function SecurityServiceLoadError({ error, onRetry }: SecurityServiceLoadErrorProps) {
  const { t } = useLingui()
  return (
    <SharedFileSystemDetailLoadError
      error={error}
      onRetry={onRetry}
      backTarget="security-services"
      notFoundTitle={t`Security Service Not Found`}
      notFoundDescription={t`This security service does not exist or is not accessible in this project.`}
      forbiddenDescription={t`You don't have permission to view this security service.`}
      errorTitle={t`Error Loading Security Service`}
      errorDescription={t`The security service could not be loaded. Try again.`}
    />
  )
}

interface SecurityServiceDetailProps {
  projectId: string
  securityServiceId: string
  routeId: string
}

export function SecurityServiceDetail({ projectId, securityServiceId, routeId }: SecurityServiceDetailProps) {
  const { t } = useLingui()

  const { data, status, error, refetch } = trpcReact.sharedFileSystem.getSecurityServiceById.useQuery(
    { project_id: projectId, securityServiceId },
    { retry: false }
  )

  // Set breadcrumb before any early return: the ID while loading/error, the name on success
  useSetBreadcrumb(routeId, data ? getSecurityServiceDisplayName(data) : securityServiceId)

  if (status === "pending") {
    return <Status status="progress" title={t`Loading Security Service Details...`} />
  }

  if (status === "error") {
    return <SecurityServiceLoadError error={error} onRetry={() => void refetch()} />
  }

  return (
    <>
      <ContentHeader title={getSecurityServiceDisplayName(data)} projectId={projectId} />
      <SecurityServiceDetailsView securityService={data} />
    </>
  )
}
