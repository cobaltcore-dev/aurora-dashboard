import { Button, ButtonRow, Message } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"

interface RouteErrorProps {
  error: unknown
  title?: string
  statusCode?: number
  helpText?: string
  onBackClick?: () => void
  onHomeClick?: () => void
  reset?: () => void
}

export function RouteError({
  error,
  statusCode,
  title,
  helpText,
  onBackClick,
  onHomeClick,
  reset,
}: RouteErrorProps) {
  const { t } = useLingui()

  const defaultTitle = t`Unable to Load Content`
  const defaultHelpText = t`This could be due to insufficient permissions or a temporary service issue. Please check your access rights or try refreshing the page.`
  const defaultErrorMessage = t`An unexpected error occurred`

  const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : defaultErrorMessage

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <Message variant="danger" title={title || defaultTitle} className="max-w-2xl">
        <div className="space-y-2">
          {statusCode && <div className="text-6xl font-bold text-theme-error">{statusCode}</div>}
          <p className="text-theme-error">{errorMessage}</p>
          <p className="text-theme-light mt-2 text-sm">{helpText || defaultHelpText}</p>
          {(onBackClick || onHomeClick || reset) && (
            <ButtonRow className="mt-6">
              {onBackClick && (
                <Button onClick={onBackClick} variant="primary">
                  <Trans>Back</Trans>
                </Button>
              )}
              {onHomeClick && (
                <Button onClick={onHomeClick}>
                  <Trans>Home</Trans>
                </Button>
              )}
              {reset && (
                <Button onClick={reset}>
                  <Trans>Try Again</Trans>
                </Button>
              )}
            </ButtonRow>
          )}
        </div>
      </Message>
    </div>
  )
}
