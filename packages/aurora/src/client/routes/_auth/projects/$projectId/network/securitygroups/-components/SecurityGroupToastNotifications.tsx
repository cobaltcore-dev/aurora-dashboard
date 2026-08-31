import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ToastReturnType = { message: ReactNode } & NotificationOptions

// ── Security Group operations ──────────────────────────────────────────────

export const getSecurityGroupDeletedToast = (name: string): ToastReturnType => ({
  message: <Trans>Security Group Deleted</Trans>,
  description: <Trans>Security group "{name}" was successfully deleted.</Trans>,
})

export const getSecurityGroupDeleteErrorToast = (errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Delete Security Group</Trans>,
  description: <Trans>Could not delete security group: {errorMessage}</Trans>,
})

export const getSecurityGroupUpdatedToast = (name: string): ToastReturnType => ({
  message: <Trans>Security Group Updated</Trans>,
  description: <Trans>Security group "{name}" was successfully updated.</Trans>,
})

export const getSecurityGroupUpdateErrorToast = (errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Update Security Group</Trans>,
  description: <Trans>Could not update security group: {errorMessage}</Trans>,
})

// ── Rule operations ────────────────────────────────────────────────────────

export const getSecurityGroupRuleCreatedToast = (): ToastReturnType => ({
  message: <Trans>Rule Created</Trans>,
  description: <Trans>Security group rule was successfully created.</Trans>,
})

export const getSecurityGroupRuleCreateErrorToast = (errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Create Rule</Trans>,
  description: <Trans>Could not create security group rule: {errorMessage}</Trans>,
})

export const getSecurityGroupRuleDeletedToast = (): ToastReturnType => ({
  message: <Trans>Rule Deleted</Trans>,
  description: <Trans>Security group rule was successfully deleted.</Trans>,
})

export const getSecurityGroupRuleDeleteErrorToast = (errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Delete Rule</Trans>,
  description: <Trans>Could not delete security group rule: {errorMessage}</Trans>,
})

// ── RBAC Policy operations ─────────────────────────────────────────────────

export const getRBACPolicyAddedToast = (targetTenant: string): ToastReturnType => ({
  message: <Trans>Security Group Shared</Trans>,
  description: <Trans>Security group was successfully shared with project "{targetTenant}".</Trans>,
})

export const getRBACPolicyAddErrorToast = (errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Share Security Group</Trans>,
  description: <Trans>Could not share security group: {errorMessage}</Trans>,
})

export const getRBACPolicyDeletedToast = (targetTenant: string): ToastReturnType => ({
  message: <Trans>Access Revoked</Trans>,
  description: <Trans>Access for project "{targetTenant}" was successfully revoked.</Trans>,
})

export const getRBACPolicyDeleteErrorToast = (errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Revoke Access</Trans>,
  description: <Trans>Could not revoke access: {errorMessage}</Trans>,
})
