import {
  Button,
  ButtonRow,
  ContentHeading,
  PageHeader,
  Container,
  AppShell,
} from "@cloudoperators/juno-ui-components/index"
import { Trans } from "@lingui/react/macro"
import Logo from "../../assets/logo.svg?react"
import styles from "../../index.css?inline"

interface ErrorPageProps {
  statusCode?: number
  message: string
  onHomeClick?: () => void
  onBackClick?: () => void
  title: string
  showHeader?: boolean
  reset?: () => void
}

export function ErrorPage({
  statusCode,
  message,
  onHomeClick,
  onBackClick,
  title,
  showHeader = true,
  reset,
}: ErrorPageProps) {
  const content = (
    <Container className="flex flex-col items-center justify-center py-12 px-6 sm:px-12 md:px-20 max-w-3xl mx-auto min-h-full">
      {statusCode && <div className="text-6xl font-bold text-theme-high">{statusCode}</div>}
      <ContentHeading>{title}</ContentHeading>
      <p>{message}</p>
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
    </Container>
  )

  if (showHeader) {
    return (
      <div>
        <style>{styles.toString()}</style>
        <AppShell
          pageHeader={
            <PageHeader
              applicationName="Aurora"
              onClick={onHomeClick}
              logo={<Logo className="w-6 h-6 fill-theme-accent" title="Aurora" />}
            />
          }
          className="min-h-screen"
          fullWidthContent
        >
          {content}
        </AppShell>
      </div>
    )
  }

  return <>{content}</>
}
