import { AuroraSignalSessionType } from "@cobaltcore-dev/aurora-signal"

interface AuroraSession {
  openstack: Awaited<AuroraSignalSessionType | null>
}
export interface AuroraContext {
  validateSession: () => AuroraSession | null
}
