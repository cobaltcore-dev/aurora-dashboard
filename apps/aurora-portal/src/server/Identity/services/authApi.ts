import * as dotenv from "dotenv"

dotenv.config()

const identityEndpoint = process.env.IDENTITY_ENDPOINT || "http://localhost:5000/v3"

// Ensure it ends with a single slash
const normalizedEndpoint = identityEndpoint?.endsWith("/") ? identityEndpoint : `${identityEndpoint}/`

// Construct the URL
const tokensEndpoint = new URL("auth/tokens", normalizedEndpoint)

interface AuthScope {
  project?: {
    name?: string
    id?: string
    domain?: {
      name?: string
      id?: string
    }
  }
  domain?: {
    name?: string
    id?: string
  }
}

export interface KeystoneAuthTokenRequest {
  auth: {
    identity: {
      methods: string[] // Authentication methods, e.g., ["password"]
      password?: {
        user: {
          name: string // Username
          password: string // User password
          domain?: {
            name?: string // Domain name
            id?: string // Domain ID
          }
        }
      }
      token?: {
        id: string // Token ID
      }
    }
    scope?: AuthScope
  }
}

interface CreateTokenParams {
  user: string
  password: string
  domainName: string
  scope?: AuthScope
}

export const createToken = async ({ user, password, domainName, scope }: CreateTokenParams) => {
  const auth: KeystoneAuthTokenRequest = {
    auth: {
      identity: {
        methods: ["password"],
        password: {
          user: {
            name: user,
            password,
            domain: { name: domainName },
          },
        },
      },
      scope,
    },
  }

  const response = await fetch(tokensEndpoint.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(auth),
  })

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  const tokenData = await response.json().then((data) => data.token)
  const authToken = response.headers.get("X-Subject-Token")

  return { tokenData, authToken }
}

export const validateToken = async (token: string, options?: { nocatalog: boolean }) => {
  const url = new URL(tokensEndpoint)
  if (options?.nocatalog) {
    url.searchParams.set("nocatalog", "true")
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "X-Auth-Token": token, "X-Subject-Token": token },
  })
  if (!response.ok) throw new Error(response.statusText)

  return response.json().then((data) => data.token)
}

export const rescopeToken = async (token: string, scope: AuthScope) => {
  const auth: KeystoneAuthTokenRequest = {
    auth: {
      identity: {
        methods: ["token"],
        token: {
          id: token,
        },
      },
      scope,
    },
  }

  const response = await fetch(tokensEndpoint.toString(), {
    method: "POST",
    headers: { "X-Auth-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify(auth),
  })

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  const tokenData = await response.json().then((data) => data.token)
  const authToken = response.headers.get("X-Subject-Token")

  return { tokenData, authToken }
}

export const getAuthDomains = async (authToken: string) => {
  const url = new URL("auth/domains", tokensEndpoint)
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "X-Auth-Token": authToken },
  })

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  return response.json().then((data) => data.domains)
}

export const getAuthProjects = async (authToken: string) => {
  const url = new URL("auth/projects", tokensEndpoint)
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "X-Auth-Token": authToken },
  })

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  return response.json().then((data) => data.projects)
}
