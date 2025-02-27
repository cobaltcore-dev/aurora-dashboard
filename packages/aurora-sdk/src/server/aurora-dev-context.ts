import { AuroraContext } from "./aurora-context"
import { SignalOpenstackSession, AuthConfig } from "@cobaltcore-dev/signal-openstack"

interface CredentialsParams extends AuthConfig {
  identityEndpoint: string
}

/**
 * Create a development context for Aurora
 * @param params - The parameters to create the context
 * @returns The AuroraContext
 */
export async function createAuroraDevelopmentContext(params: CredentialsParams) {
  const signalOpenstackSession = await SignalOpenstackSession(
    params.identityEndpoint,
    { auth: params.auth },
    { debug: true }
  )

  return async function createContext(): Promise<AuroraContext> {
    return {
      validateSession: () => signalOpenstackSession.isValid() || false,
      openstack: signalOpenstackSession,
    }
  }
}
