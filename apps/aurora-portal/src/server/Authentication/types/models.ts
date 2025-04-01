import type { SignalOpenstackTokenType } from "@cobaltcore-dev/signal-openstack"
export type { AuthConfig } from "@cobaltcore-dev/signal-openstack"

export interface User {
  id: number
  name: string
}

export interface Domain {
  id?: string | undefined
  name?: string | undefined
}

export type TokenData = SignalOpenstackTokenType["tokenData"]
export type AuthToken = SignalOpenstackTokenType["authToken"]
