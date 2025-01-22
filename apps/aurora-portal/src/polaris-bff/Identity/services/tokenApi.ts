import * as dotenv from "dotenv"

dotenv.config()

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
  return fetch(new URL("auth/tokens", process.env.IDENTITY_ENDPOINT), {
    method: "POST",
    headers,
    body: JSON.stringify(auth),
  })
}

export const validateToken = async (token: string, options?: { nocatalog: boolean }) => {
  const headers = new Headers()
  headers.set("X-Subject-Token", token)
  headers.set("X-Auth-Token", token)
  let path = "auth/tokens"
  if (options?.nocatalog) {
    path += "?nocatalog=true"
  }

  return fetch(new URL(path, process.env.IDENTITY_ENDPOINT), {
    method: "GET",
    headers,
  })
}
