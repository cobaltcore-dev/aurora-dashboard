import { AuroraSignalSessionType } from "@cobaltcore-dev/aurora-signal"

export interface AuroraContext {
  validateSession: () => boolean
  openstack?: Awaited<AuroraSignalSessionType>
}
