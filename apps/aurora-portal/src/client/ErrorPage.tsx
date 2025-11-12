import { Button, ContentHeading, PageHeader, Stack } from "@cloudoperators/juno-ui-components/index"
import { Trans } from "@lingui/react/macro"
import Logo from "./assets/logo.svg?react"

interface ErrorPageProps {
  statusCode?: number
  message: string
  onHomeClick?: () => void
  title: string
  showHeader?: boolean
}

export function ErrorPage({ statusCode, message, onHomeClick, title, showHeader = true }: ErrorPageProps) {
  const content = (
    <Stack direction="vertical" alignment="center" distribution="center" className="py-20">
      {statusCode && <div className="text-6xl font-bold text-theme-danger mb-4">{statusCode}</div>}
      <ContentHeading>{title}</ContentHeading>
      <p className="">{message}</p>
      {onHomeClick && (
        <Button onClick={onHomeClick} variant="primary" className="mt-4">
          <Trans id="go_to_home">Go to Home</Trans>
        </Button>
      )}
    </Stack>
  )

  // For 500 errors that bypass layout - needs own header
  if (showHeader) {
    return (
      <>
        <PageHeader
          applicationName="Aurora"
          onClick={onHomeClick}
          logo={<Logo className="w-6 h-6 fill-theme-accent" title="Aurora" />}
        />
        {content}
      </>
    )
  }

  return <>{content}</>
}
