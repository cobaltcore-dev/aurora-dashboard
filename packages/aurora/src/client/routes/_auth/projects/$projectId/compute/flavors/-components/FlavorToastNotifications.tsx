import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ToastReturnType = { message: ReactNode } & NotificationOptions

export const getFlavorCreatedToast = (name: string): ToastReturnType => ({
  message: <Trans>Flavor Created</Trans>,
  description: <Trans>Flavor "{name}" was successfully created.</Trans>,
})

export const getFlavorDeletedToast = (name: string): ToastReturnType => ({
  message: <Trans>Flavor Deleted</Trans>,
  description: <Trans>Flavor "{name}" was successfully deleted.</Trans>,
})

export const getFlavorAccessAddedToast = (projectId: string, flavorName: string): ToastReturnType => ({
  message: <Trans>Access Added</Trans>,
  description: (
    <Trans>
      Project "{projectId}" now has access to flavor "{flavorName}".
    </Trans>
  ),
})

export const getFlavorAccessRemovedToast = (projectId: string, flavorName: string): ToastReturnType => ({
  message: <Trans>Access Removed</Trans>,
  description: (
    <Trans>
      Access for project "{projectId}" to flavor "{flavorName}" was successfully revoked.
    </Trans>
  ),
})

export const getFlavorAccessAddErrorToast = (projectId: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Add Access</Trans>,
  description: (
    <Trans>
      Could not add access for project "{projectId}": {errorMessage}
    </Trans>
  ),
})

export const getFlavorAccessRemoveErrorToast = (projectId: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Remove Access</Trans>,
  description: (
    <Trans>
      Could not remove access for project "{projectId}": {errorMessage}
    </Trans>
  ),
})
