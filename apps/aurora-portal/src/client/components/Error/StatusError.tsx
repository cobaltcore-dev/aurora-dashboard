import { Button, ButtonRow, Container, ContentHeading } from "@cloudoperators/juno-ui-components/index"
import { Trans } from "@lingui/react/macro"

interface StatusErrorProps {
  message: string
  statusCode?: number
  onHomeClick?: () => void
  onBackClick?: () => void
  title: string
  showHeader?: boolean
  reset?: () => void
}

export function StatusError({ message, statusCode, onHomeClick, onBackClick, title, reset }: StatusErrorProps) {
  return (
    <Container className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-6 py-12 sm:px-12 md:px-20">
      {statusCode && <div className="text-theme-high text-6xl font-bold">{statusCode}</div>}
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
}
