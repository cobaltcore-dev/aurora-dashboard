import { Status, Button } from "@cloudoperators/juno-ui-components"
import { useLingui, Trans } from "@lingui/react/macro"
import { useNavigate } from "@tanstack/react-router"

interface RouteErrorProps {
  error: unknown
  title?: string
  helpText?: string
  /** Explicitly pass a safe error message to display. Use this when you want to show specific error details. */
  safeErrorMessage?: string
}

export function RouteError({ error, title, helpText, safeErrorMessage }: RouteErrorProps) {
  const { t } = useLingui()
  const navigate = useNavigate()

  const defaultTitle = t`Unable to Load Content`
  const defaultHelpText = t`This could be due to insufficient permissions or a temporary service issue. Please check your access rights or try refreshing the page.`
  const defaultErrorMessage = t`An unexpected error occurred.`

  // Security: Do not expose raw Error.message by default as it may contain sensitive information.
  // Only display:
  // 1. Explicitly passed safeErrorMessage
  // 2. String errors (when caller explicitly passes a safe string)
  // 3. error.safeMessage if present (for controlled error exposure)
  // 4. Default translated message for all other cases
  const errorMessage =
    safeErrorMessage ||
    (typeof error === "string" ? error : null) ||
    (error && typeof error === "object" && "safeMessage" in error && typeof error.safeMessage === "string"
      ? error.safeMessage
      : null) ||
    defaultErrorMessage

  const additionalInfo = helpText || defaultHelpText

  return (
    <Status
      status="error"
      title={title || defaultTitle}
      body={errorMessage + " " + additionalInfo}
      action={
        <Button variant="primary" onClick={() => navigate({ to: "/" })}>
          <Trans>Go to Home</Trans>
        </Button>
      }
    />
  )
}
