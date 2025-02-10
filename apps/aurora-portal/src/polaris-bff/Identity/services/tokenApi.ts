import * as dotenv from "dotenv"

dotenv.config()

const identityEndpoint = process.env.IDENTITY_ENDPOINT

// Ensure it ends with a single slash
const normalizedEndpoint = identityEndpoint?.endsWith("/") ? identityEndpoint : `${identityEndpoint}/`

// Construct the URL
const tokensEndpoint = new URL("auth/tokens", normalizedEndpoint)

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
    }
    scope?: {
      project?: {
        name?: string // Project name
        id?: string // Project ID
        domain?: {
          name?: string // Domain name
          id?: string // Domain ID
        }
      }
    }
  }
}

interface CreateTokenParams {
  user: string
  password: string
  domainName: string
}

export const createUnscopedToken = async ({ user, password, domainName }: CreateTokenParams) => {
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
    },
  }
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(tokensEndpoint, {
    method: "POST",
    headers,
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
  const headers = new Headers()
  headers.set("X-Subject-Token", token)
  headers.set("X-Auth-Token", token)
  const url = new URL(tokensEndpoint)
  if (options?.nocatalog) {
    url.searchParams.set("nocatalog", "true")
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  })
  if (!response.ok) throw new Error(response.statusText)

  return response.json().then((data) => data.token)
}
