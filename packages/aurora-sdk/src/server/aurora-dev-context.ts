import { AuroraContext } from "./aurora-context"
import { AuroraSignalSession, AuthConfig } from "@cobaltcore-dev/aurora-signal"

interface CredentialsParams extends AuthConfig {
  identityEndpoint: string
}

/**
 * Create a development context for Aurora
 * @param params - The parameters to create the context
 * @returns The AuroraContext
 */

export async function createAuroraDevelopmentContext(params: CredentialsParams) {
  const auroraSignalSession = await AuroraSignalSession(params.identityEndpoint, { auth: params.auth }, { debug: true })
  const session = auroraSignalSession ? { openstack: auroraSignalSession } : null

  return async function createContext(): Promise<AuroraContext> {
    return {
      validateSession: () => session,
    }
  }
}
