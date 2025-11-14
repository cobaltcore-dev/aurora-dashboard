import { Button, ButtonRow, ContentHeading, PageHeader, Container } from "@cloudoperators/juno-ui-components/index"
import { Trans } from "@lingui/react/macro"
import Logo from "../../assets/logo.svg?react"

interface ErrorPageProps {
  statusCode?: number
  message: string
  onHomeClick?: () => void
  onBackClick?: () => void
  title: string
  showHeader?: boolean
}

export function ErrorPage({ statusCode, message, onHomeClick, onBackClick, title, showHeader = true }: ErrorPageProps) {
  const content = (
    <Container className="flex flex-col items-center justify-center py-12 px-6 sm:px-12 md:px-20">
      {statusCode && <div className="text-6xl font-bold text-theme-high">{statusCode}</div>}
      <ContentHeading>{title}</ContentHeading>
      <p>{message}</p>
      {(onBackClick || onHomeClick) && (
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
        </ButtonRow>
      )}
    </Container>
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
