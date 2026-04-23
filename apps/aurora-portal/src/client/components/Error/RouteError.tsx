import { ContentHeading } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

interface RouteErrorProps {
  error: unknown
  title?: string
  helpText?: string
}

export function RouteError({ error, title, helpText }: RouteErrorProps) {
  const { t } = useLingui()

  const defaultTitle = t`Unable to Load Content`
  const defaultHelpText = t`This could be due to insufficient permissions or a temporary service issue. Please check your access rights or try refreshing the page.`
  const defaultErrorMessage = t`An unexpected error occurred`

  const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : defaultErrorMessage

  return (
    <div className="flex min-h-[400px] p-8">
      <div className="space-y-2">
        <ContentHeading className="text-theme-info">{title || defaultTitle}</ContentHeading>
        <p>{errorMessage}</p>
        <p className="text-theme-light mt-2 text-sm">{helpText || defaultHelpText}</p>
      </div>
    </div>
  )
}
