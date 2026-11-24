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
  backTarget?: "shares" | "share-networks"
}

interface BackButtonsProps {
  backTarget: "shares" | "share-networks"
  projectId: string
  onRetry?: () => void
}

function BackButtons({ backTarget, projectId, onRetry }: BackButtonsProps) {
  const navigate = useNavigate()

  const handleBackClick = () => {
    if (backTarget === "share-networks") {
      navigate({
        to: "/projects/$projectId/shared-file-system/share-networks",
        params: { projectId },
      })
    } else {
      navigate({
        to: "/projects/$projectId/shared-file-system",
        params: { projectId },
      })
    }
  }

  const handleHomeClick = () => {
    navigate({
      to: "/projects/$projectId",
      params: { projectId },
    })
  }

  return (
    <ButtonRow>
      <Button variant="primary" onClick={handleBackClick}>
        {backTarget === "share-networks" ? <Trans>Back to Share Networks</Trans> : <Trans>Back to Shares</Trans>}
      </Button>
      <Button onClick={handleHomeClick}>
        <Trans>Home</Trans>
      </Button>
      {onRetry && (
        <Button onClick={onRetry}>
          <Trans>Try Again</Trans>
        </Button>
      )}
    </ButtonRow>
  )
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
  backTarget = "shares",
}: SharedFileSystemDetailLoadErrorProps) {
  const { t } = useLingui()
  const { projectId } = useParams({ strict: false })

  const errorCode = (error as { data?: { code?: string } } | null)?.data?.code ?? "UNKNOWN_ERROR"

  if (errorCode === "NOT_FOUND" || errorCode === "BAD_REQUEST") {
    return (
      <RouteIdLevelDefaultError
        code={404}
        errorTitle={notFoundTitle}
        errorDescription={notFoundDescription}
        action={<BackButtons backTarget={backTarget} projectId={projectId as string} />}
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
        action={<BackButtons backTarget={backTarget} projectId={projectId as string} />}
      />
    )
  }

  // Generic error (retryable)
  return (
    <RouteIdLevelDefaultError
      code={null}
      errorTitle={errorTitle}
      errorDescription={errorDescription}
      action={<BackButtons backTarget={backTarget} projectId={projectId as string} onRetry={onRetry} />}
    />
  )
}
