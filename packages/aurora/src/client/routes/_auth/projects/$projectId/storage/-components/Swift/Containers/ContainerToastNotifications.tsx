import { ReactNode } from "react"
import { NotificationOptions, Stack } from "@cloudoperators/juno-ui-components"
import { Trans, Plural } from "@lingui/react/macro"

export const getContainerCreatedToast = (containerName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Container Created</Trans>,
  description: <Trans>Container "{containerName}" was successfully created.</Trans>,
})

export const getContainerCreateErrorToast = (
  containerName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Create Container</Trans>,
  description: (
    <Trans>
      Could not create container "{containerName}": {errorMessage}
    </Trans>
  ),
})

export const getContainerEmptiedToast = (
  containerName: string,
  deletedCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Container Emptied</Trans>,
  description:
    deletedCount === 0 ? (
      <Trans>Container "{containerName}" was already empty.</Trans>
    ) : deletedCount === 1 ? (
      <Trans>
        Container "{containerName}" was successfully emptied. {deletedCount} object deleted.
      </Trans>
    ) : (
      <Trans>
        Container "{containerName}" was successfully emptied. {deletedCount} objects deleted.
      </Trans>
    ),
})

export const getContainerEmptyErrorToast = (
  containerName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Empty Container</Trans>,
  description: (
    <Trans>
      Could not empty container "{containerName}": {errorMessage}
    </Trans>
  ),
})

export const getContainerDeletedToast = (containerName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Container Deleted</Trans>,
  description: <Trans>Container "{containerName}" was successfully deleted.</Trans>,
})

export const getContainerDeleteErrorToast = (
  containerName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Delete Container</Trans>,
  description: (
    <Trans>
      Could not delete container "{containerName}": {errorMessage}
    </Trans>
  ),
})

export const getContainerUpdatedToast = (containerName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Container Updated</Trans>,
  description: <Trans>Container "{containerName}" properties were successfully updated.</Trans>,
})

export const getContainerUpdateErrorToast = (
  containerName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Update Container</Trans>,
  description: (
    <Trans>
      Could not update container "{containerName}": {errorMessage}
    </Trans>
  ),
})

export const getContainerAclUpdatedToast = (containerName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Access Control Updated</Trans>,
  description: <Trans>ACLs for container "{containerName}" were successfully updated.</Trans>,
})

export const getContainerAclUpdateErrorToast = (
  containerName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Update Access Control</Trans>,
  description: (
    <Trans>
      Could not update ACLs for container "{containerName}": {errorMessage}
    </Trans>
  ),
})

export const getContainersEmptiedToast = (
  emptiedCount: number,
  totalDeleted: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Containers Emptied</Trans>,
  description:
    totalDeleted === 0 ? (
      <Plural value={emptiedCount} one="# container was already empty." other="# containers were already empty." />
    ) : (
      <Trans>
        <Plural value={emptiedCount} one="# container" other="# containers" /> successfully emptied.{" "}
        <Plural value={totalDeleted} one="# object" other="# objects" /> deleted in total.
      </Trans>
    ),
})

export const getContainersEmptyErrorToast = (errorMessage: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Empty Containers</Trans>,
  description: (
    <span className="whitespace-pre-line">
      <Trans>One or more containers could not be emptied: {errorMessage}</Trans>
    </span>
  ),
})

export const getContainersEmptyCompleteToast = (
  emptiedCount: number,
  totalDeleted: number,
  errors: string[]
): { message: ReactNode } & NotificationOptions => {
  const hasErrors = errors.length > 0
  const hasSuccess = emptiedCount > 0
  const isPartial = hasErrors && hasSuccess

  return {
    message: isPartial ? (
      <Trans>Containers Partially Emptied</Trans>
    ) : hasErrors ? (
      <Trans>Failed to Empty Containers</Trans>
    ) : (
      <Trans>Containers Emptied</Trans>
    ),
    description: (
      <Stack direction="vertical" gap="1">
        {hasSuccess && (
          <span>
            <Trans>
              <Plural value={emptiedCount} one="# container" other="# containers" /> successfully emptied.{" "}
              <Plural value={totalDeleted} one="# object" other="# objects" /> deleted in total.
            </Trans>
          </span>
        )}
        {hasErrors && (
          <span className="whitespace-pre-line">
            {(() => {
              const errorDetails = errors.join("\n")
              return <Trans>Failed: {errorDetails}</Trans>
            })()}
          </span>
        )}
      </Stack>
    ),
  }
}
