import { useNavigate, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button, ButtonRow, Status } from "@cloudoperators/juno-ui-components"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"

interface SharedFileSystemDetailLoadErrorProps {
  error: unknown
  onRetry: () => void
  notFoundTitle: string
  notFoundDescription: string
  forbiddenDescription: string
  errorTitle: string
  errorDescription: string
}

/**
 * Error state shared by the Shared File System detail pages (route error component and query error state).
 */
export function SharedFileSystemDetailLoadError({
  error,
  onRetry,
  notFoundTitle,
  notFoundDescription,
  forbiddenDescription,
  errorTitle,
  errorDescription,
}: SharedFileSystemDetailLoadErrorProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = useParams({ strict: false })

  const errorCode = (error as { data?: { code?: string } } | null)?.data?.code ?? "UNKNOWN_ERROR"

  if (errorCode === "NOT_FOUND" || errorCode === "BAD_REQUEST") {
    return (
      <RouteIdLevelDefaultError
        code={404}
        errorTitle={notFoundTitle}
        errorDescription={notFoundDescription}
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
    return <Status status="error" title={t`Access Denied`} body={forbiddenDescription} />
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
      errorTitle={errorTitle}
      errorDescription={errorDescription}
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
