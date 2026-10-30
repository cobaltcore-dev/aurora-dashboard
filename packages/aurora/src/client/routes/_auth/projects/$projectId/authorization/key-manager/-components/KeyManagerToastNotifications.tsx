import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ToastReturnType = { message: ReactNode } & NotificationOptions

// ── Secrets ──────────────────────────────────────────────────────────────────

export const getSecretCreatedToast = (name?: string): ToastReturnType => ({
  message: <Trans>Secret Created</Trans>,
  description: name ? (
    <Trans>Secret "{name}" was successfully created.</Trans>
  ) : (
    <Trans>The secret was successfully created.</Trans>
  ),
})

export const getSecretDeletedToast = (name: string): ToastReturnType => ({
  message: <Trans>Secret Deleted</Trans>,
  description: <Trans>Secret "{name}" was successfully deleted.</Trans>,
})

// ── Containers ───────────────────────────────────────────────────────────────

export const getContainerCreatedToast = (name?: string): ToastReturnType => ({
  message: <Trans>Container Created</Trans>,
  description: name ? (
    <Trans>Container "{name}" was successfully created.</Trans>
  ) : (
    <Trans>The container was successfully created.</Trans>
  ),
})

export const getContainerDeletedToast = (name: string): ToastReturnType => ({
  message: <Trans>Container Deleted</Trans>,
  description: <Trans>Container "{name}" was successfully deleted.</Trans>,
})

// ── Orders ───────────────────────────────────────────────────────────────────

export const getOrderCreatedToast = (name?: string): ToastReturnType => ({
  message: <Trans>Order Created</Trans>,
  description: name ? (
    <Trans>Order "{name}" was successfully created.</Trans>
  ) : (
    <Trans>The order was successfully created.</Trans>
  ),
})

export const getOrderDeletedToast = (name: string): ToastReturnType => ({
  message: <Trans>Order Deleted</Trans>,
  description: <Trans>Order "{name}" was successfully deleted.</Trans>,
})
