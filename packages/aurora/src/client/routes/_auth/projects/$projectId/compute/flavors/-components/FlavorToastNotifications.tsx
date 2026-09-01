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
