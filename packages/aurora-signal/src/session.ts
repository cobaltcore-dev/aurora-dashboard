import { AuthSchema, AuthConfig } from "./auth-config"
import type { AuroraSignalOptions } from "./shared-types"
import { AuroraSignalTokenType, AuroraSignalToken } from "./token"
import { del, post, get } from "./client"
import { AuroraSignalService } from "./service"
import { AuroraSignalError } from "./error"

function normalizeOpenstackIdentityUrl(url: string) {
  const match = url.match(/\/v3\/?$/) // Check if the URL already ends with /v3 (optional trailing /)
  const baseUrl = url.replace(/(\/v\d+\/?)?$/, "") // Remove any version part
  const version = match ? "/v3" : "/v3" // Force v3

  return `${baseUrl}${version}/auth/tokens`
}

// This Options pre-define the region, interfaceName, and debug for the whole session
export function AuroraSignalSession(
  identityEndpoint: string,
  authConfig: AuthConfig,
  options: AuroraSignalOptions = {}
) {
  AuthSchema.parse(authConfig) // Validate the auth config
  const endpoint = normalizeOpenstackIdentityUrl(identityEndpoint.toString())
  const debug = options.debug === true
  const defaultHeaders: Record<string, string> = { "Content-Type": "application/json" }
  let token: AuroraSignalTokenType | undefined = undefined

  // private function authenticate
  const authenticate = async () => {
    // If we already have a valid token, we don't need to create a new one
    if (token !== undefined && token?.isExpired() === false) return

    const authHeaders: Record<string, string> = { ...defaultHeaders }

    let response: Response
    if ("token" in authConfig.auth.identity && authConfig.auth.identity.token.id && !authConfig.auth.scope) {
      // If we have token authentication and no scope, we can use the get method to validate the token
      authHeaders["X-Auth-Token"] = authConfig.auth.identity.token.id
      authHeaders["X-Subject-Token"] = authConfig.auth.identity.token.id
      response = await get(endpoint, { headers: authHeaders, debug: debug })
    } else {
      // Otherwise, we need to create a new token
      response = await post(endpoint, authConfig, { headers: authHeaders, debug: debug })
    }

    const authToken = response.headers.get("X-Subject-Token")
    if (!authToken) {
      throw new AuroraSignalError("Could not retrieve auth token")
    }
    const data = await response.json()
    token = AuroraSignalToken({ tokenData: data.token, authToken: response.headers.get("X-Subject-Token")! })
  }

  // public functions
  async function terminate() {
    if (token) {
      await del(endpoint, { headers: { "X-Auth-Token": token.authToken } })
      token = undefined
    }
  }

  async function getToken(): Promise<AuroraSignalTokenType | undefined> {
    await authenticate()
    return token
  }

  async function service(name: string, serviceDefaultOptions: AuroraSignalOptions = {}) {
    await authenticate()
    if (!token) throw new AuroraSignalError("No valid token available")
    return AuroraSignalService(name, token, { ...defaultHeaders, ...options, ...serviceDefaultOptions })
  }

  // expose the public functions
  return {
    service,
    terminate,
    getToken,
  }
}

export type AuroraSignalSessionType = ReturnType<typeof AuroraSignalSession>
