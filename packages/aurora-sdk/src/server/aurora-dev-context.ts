import { AuroraContext } from "./aurora-context"
import { AuroraSignalSession, AuthConfig } from "@cobaltcore-dev/aurora-signal"

type CredentialsParams = {
  identityEndpoint: string
  authConfig: AuthConfig
}

export async function createAuroraDevelopmentContext(params: CredentialsParams) {
  const openstackSession = AuroraSignalSession(params.identityEndpoint, params.authConfig, { debug: true })

  return async function createContext(): Promise<AuroraContext> {
    return {
      validateSession: () => ({
        openstack: openstackSession,
      }),
    }
  }
}
