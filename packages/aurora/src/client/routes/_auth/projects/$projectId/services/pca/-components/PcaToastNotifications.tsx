import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ToastReturn = { message: ReactNode } & NotificationOptions

export const getPcaDeletedToast = (pcaName: string): ToastReturn => ({
  message: <Trans>Certificate Authority Deleted</Trans>,
  description: <Trans>Certificate Authority "{pcaName}" was successfully deleted.</Trans>,
})

export const getCertificateImportedToast = (): ToastReturn => ({
  message: <Trans>Certificate Imported</Trans>,
  description: <Trans>The externally signed certificate was successfully imported.</Trans>,
})
