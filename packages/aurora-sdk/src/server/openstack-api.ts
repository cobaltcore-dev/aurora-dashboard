import { Token } from "./types"
import { AuroraSDKError } from "./errors"

type CreateTokenParams = {
  endpointUrl: string
  domain: string
  user: string
  password: string
  scope?: {
    domain?: {
      id?: string
      name?: string
    }
    project?: {
      id?: string
      name?: string
    }
  }
}

type Auth = {
  identity: {
    methods: string[]
    password: {
      user: {
        domain: {
          name: string
        }
        name: string
        password: string
      }
    }
  }
  scope?: {
    project?: {
      id?: string
      name?: string
      domain?: {
        id?: string
        name?: string
      }
    }
    domain?: {
      id?: string
      name?: string
    }
  }
}

export async function createToken({
  endpointUrl,
  domain,
  user,
  password,
  scope,
}: CreateTokenParams): Promise<{ authToken?: string | null; token?: Token | null }> {
  const auth: Auth = {
    identity: {
      methods: ["password"],
      password: {
        user: {
          domain: {
            name: domain,
          },
          name: user,
          password: password,
        },
      },
    },
  }
  if (scope) {
    if (scope.project?.id) auth.scope = { project: { id: scope.project.id } }
    else if (scope.project?.name && (scope.domain?.id || scope.domain?.name)) {
      auth.scope = { project: { name: scope.project.name } }
      if (scope.domain?.id) auth.scope = { project: { name: scope.project.name, domain: { id: scope.domain.id } } }
      else if (scope.domain?.name)
        auth.scope = { project: { name: scope.project.name, domain: { name: scope.domain.name } } }
    } else if (scope.domain?.id) auth.scope = { domain: { id: scope.domain.id } }
    else if (scope.domain?.name) auth.scope = { domain: { name: scope.domain.name } }
  }

  const tokenEndpoint = new URL("auth/tokens", endpointUrl)

  return fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ auth }),
  }).then(async (response) => {
    if (!response.ok) {
      throw new AuroraSDKError("Failed to create auth token")
    }

    const authToken = response.headers.get("X-Subject-Token")
    const data = await response.json()
    const token: Token = data.token
    return { token, authToken }
  })
}
