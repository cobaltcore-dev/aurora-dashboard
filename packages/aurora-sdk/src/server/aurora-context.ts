import { SignalOpenstackSessionType } from "@cobaltcore-dev/signal-openstack"

export interface AuroraContext {
  validateSession: () => boolean
  openstack?: Awaited<SignalOpenstackSessionType>
}
