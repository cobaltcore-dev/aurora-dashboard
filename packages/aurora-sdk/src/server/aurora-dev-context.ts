import { AuroraContext } from "./aurora-context"
import { createToken } from "./openstack-api"

type CredentialsParams = {
  endpointUrl: string
  domain: string
  user: string
  password: string
  scope?: {
    domain: {
      id: string
      name: string
    }
    project: {
      id?: string
      name?: string
      domain?: {
        id?: string
        name?: string
      }
    }
  }
}

export async function createAuroraOpenstackDevContext(params: CredentialsParams) {
  const { authToken, token } = await createToken(params)
  const validateSession = async () => {
    return { authToken, token }
  }

  return async function createContext(): Promise<AuroraContext> {
    return {
      validateSession,
    }
  }
}
