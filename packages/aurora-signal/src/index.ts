import { AuthCredentials } from "./auth-config"
import { Session } from "./session"
import { Service, ServiceOptions } from "./service"

const DEFAULT_OPTIONS = {
  headers: { "Content-Type": "application/json" },
  debug: false,
}

interface Options {
  region?: string
  interfaceName?: string
  debug?: boolean
}

export const AuroraSignal = (identityURL: string, authCredentials: AuthCredentials, options: Options = {}) => {
  const session = new Session(identityURL, authCredentials, options.debug === true)

  return {
    service: (name: string, serviceOptions: ServiceOptions = {}) =>
      Service(name, session, {
        ...DEFAULT_OPTIONS,
        ...options,
        ...serviceOptions,
      }),
    terminate: session.terminate,
    token: async () => session.getToken(),
    authToken: async () => session.getToken().then((token) => token?.authToken),
  }
}
