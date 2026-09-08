import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ToastReturnType = { message: ReactNode } & NotificationOptions

export const getFloatingIpUpdatedToast = (ip: string): ToastReturnType => ({
  message: <Trans>Floating IP Updated</Trans>,
  description: <Trans>Floating IP "{ip}" was successfully updated.</Trans>,
})

export const getFloatingIpAssociatedToast = (ip: string): ToastReturnType => ({
  message: <Trans>Floating IP Associated</Trans>,
  description: <Trans>Floating IP "{ip}" was successfully associated with the port.</Trans>,
})

export const getFloatingIpDetachedToast = (ip: string): ToastReturnType => ({
  message: <Trans>Floating IP Detached</Trans>,
  description: <Trans>Floating IP "{ip}" was successfully detached from the port.</Trans>,
})

export const getFloatingIpReleasedToast = (ip: string): ToastReturnType => ({
  message: <Trans>Floating IP Released</Trans>,
  description: <Trans>Floating IP "{ip}" was successfully released.</Trans>,
})
