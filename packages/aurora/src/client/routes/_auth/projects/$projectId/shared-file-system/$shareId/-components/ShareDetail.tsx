import { useNavigate, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Button, ButtonRow, Status } from "@cloudoperators/juno-ui-components"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { getShareDisplayName } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"
import { ShareDetailsView } from "./ShareDetailsView"
import type { ShareDetailsTab } from "./shareDetailUtils"

interface ShareLoadErrorProps {
  error: unknown
  onRetry: () => void
}

/**
 * Error state for the share details, shared by the route error component and the query error state.
 */
export function ShareLoadError({ error, onRetry }: ShareLoadErrorProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = useParams({ strict: false })

  const errorCode = (error as { data?: { code?: string } } | null)?.data?.code ?? "UNKNOWN_ERROR"

  if (errorCode === "NOT_FOUND" || errorCode === "BAD_REQUEST") {
    return (
      <RouteIdLevelDefaultError
        code={404}
        errorTitle={t`Share Not Found`}
        errorDescription={t`This share does not exist or is not accessible in this project.`}
        action={
          <ButtonRow>
            <Button
              variant="primary"
              onClick={() =>
                navigate({
                  to: "/projects/$projectId/shared-file-system",
                  params: { projectId: projectId as string },
                })
              }
            >
              <Trans>Back to Shares</Trans>
            </Button>
            <Button
              onClick={() =>
                navigate({
                  to: "/projects/$projectId",
                  params: { projectId: projectId as string },
                })
              }
            >
              <Trans>Home</Trans>
            </Button>
          </ButtonRow>
        }
      />
    )
  }

  if (errorCode === "FORBIDDEN") {
    return <Status status="error" title={t`Access Denied`} body={t`You don't have permission to view this share.`} />
  }

  if (errorCode === "UNAUTHORIZED") {
    return (
      <RouteIdLevelDefaultError
        code={401}
        errorTitle={t`Session Expired`}
        errorDescription={t`The session has expired. Sign in again to continue.`}
        action={
          <ButtonRow>
            <Button
              variant="primary"
              onClick={() =>
                navigate({
                  to: "/projects/$projectId/shared-file-system",
                  params: { projectId: projectId as string },
                })
              }
            >
              <Trans>Back to Shares</Trans>
            </Button>
            <Button
              onClick={() =>
                navigate({
                  to: "/projects/$projectId",
                  params: { projectId: projectId as string },
                })
              }
            >
              <Trans>Home</Trans>
            </Button>
          </ButtonRow>
        }
      />
    )
  }

  // Generic error (retryable)
  return (
    <RouteIdLevelDefaultError
      code={null}
      errorTitle={t`Error Loading Share`}
      errorDescription={t`The share could not be loaded. Try again.`}
      action={
        <ButtonRow>
          <Button
            variant="primary"
            onClick={() =>
              navigate({
                to: "/projects/$projectId/shared-file-system",
                params: { projectId: projectId as string },
              })
            }
          >
            <Trans>Back to Shares</Trans>
          </Button>
          <Button
            onClick={() =>
              navigate({
                to: "/projects/$projectId",
                params: { projectId: projectId as string },
              })
            }
          >
            <Trans>Home</Trans>
          </Button>
          <Button onClick={onRetry}>
            <Trans>Try Again</Trans>
          </Button>
        </ButtonRow>
      }
    />
  )
}

interface ShareDetailProps {
  projectId: string
  shareId: string
  routeId: string
  activeTab: ShareDetailsTab
  onTabChange: (tab: ShareDetailsTab) => void
}

export function ShareDetail({ projectId, shareId, routeId, activeTab, onTabChange }: ShareDetailProps) {
  const { t } = useLingui()

  const {
    data: share,
    status,
    error,
    refetch,
  } = trpcReact.sharedFileSystem.getShareById.useQuery({ project_id: projectId, shareId }, { retry: false })

  // Set breadcrumb before any early return: show the ID while loading/error, the name on success
  useSetBreadcrumb(routeId, share ? getShareDisplayName(share) : shareId)

  if (status === "pending") {
    return <Status status="progress" title={t`Loading Share Details...`} />
  }

  if (status === "error") {
    return <ShareLoadError error={error} onRetry={() => void refetch()} />
  }

  return (
    <>
      <ContentHeader title={getShareDisplayName(share)} projectId={projectId} />
      <ShareDetailsView share={share} projectId={projectId} activeTab={activeTab} onTabChange={onTabChange} />
    </>
  )
}
