import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ToastReturnType = { message: ReactNode } & NotificationOptions

// ── Security Group operations ──────────────────────────────────────────────

export const getSecurityGroupDeletedToast = (name: string): ToastReturnType => ({
  message: <Trans>Security Group Deleted</Trans>,
  description: <Trans>Security group "{name}" was successfully deleted.</Trans>,
})

export const getSecurityGroupUpdatedToast = (name: string): ToastReturnType => ({
  message: <Trans>Security Group Updated</Trans>,
  description: <Trans>Security group "{name}" was successfully updated.</Trans>,
})

// ── Rule operations ────────────────────────────────────────────────────────

export const getSecurityGroupRuleCreatedToast = (): ToastReturnType => ({
  message: <Trans>Rule Created</Trans>,
  description: <Trans>Security group rule was successfully created.</Trans>,
})

export const getSecurityGroupRuleDeletedToast = (): ToastReturnType => ({
  message: <Trans>Rule Deleted</Trans>,
  description: <Trans>Security group rule was successfully deleted.</Trans>,
})

// ── RBAC Policy operations ─────────────────────────────────────────────────

export const getRBACPolicyAddedToast = (targetTenant: string): ToastReturnType => ({
  message: <Trans>Security Group Shared</Trans>,
  description: <Trans>Security group was successfully shared with project "{targetTenant}".</Trans>,
})

export const getRBACPolicyDeletedToast = (targetTenant: string): ToastReturnType => ({
  message: <Trans>Access Revoked</Trans>,
  description: <Trans>Access for project "{targetTenant}" was successfully revoked.</Trans>,
})
