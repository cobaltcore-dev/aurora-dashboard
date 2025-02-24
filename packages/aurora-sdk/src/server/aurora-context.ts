import { AuroraSignalSessionType } from "@cobaltcore-dev/aurora-signal"

export interface AuroraContext {
  validateSession: () => { openstack: AuroraSignalSessionType | null }
}
