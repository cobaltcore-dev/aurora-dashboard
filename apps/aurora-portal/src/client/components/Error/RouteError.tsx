import { ContentHeading } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

interface RouteErrorProps {
  error: unknown
  title?: string
  helpText?: string
  /** Explicitly pass a safe error message to display. Use this when you want to show specific error details. */
  safeErrorMessage?: string
}

export function RouteError({ error, title, helpText, safeErrorMessage }: RouteErrorProps) {
  const { t } = useLingui()

  const defaultTitle = t`Unable to Load Content`
  const defaultHelpText = t`This could be due to insufficient permissions or a temporary service issue. Please check your access rights or try refreshing the page.`
  const defaultErrorMessage = t`An unexpected error occurred`

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

  return (
    <div className="flex min-h-100 flex-col space-y-2 p-8">
      <ContentHeading className="text-theme-info">{title || defaultTitle}</ContentHeading>
      <p>{errorMessage}</p>
      <p className="text-theme-light text-sm">{helpText || defaultHelpText}</p>
    </div>
  )
}
