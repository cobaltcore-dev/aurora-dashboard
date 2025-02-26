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

/**
 * This Options pre-define the region, interfaceName, and debug for the whole session
 * @param identityEndpoint - The Openstack Identity endpoint
 * @param authConfig - The authentication configuration
 * @param options - The options for the session
 * @throws {AuroraSignalApiError} If the request fails.
 */
export async function AuroraSignalSession(
  identityEndpoint: string,
  authConfig: AuthConfig,
  options: AuroraSignalOptions = {}
) {
  AuthSchema.parse(authConfig) // Validate the auth config
  const endpoint = normalizeOpenstackIdentityUrl(identityEndpoint.toString())
  const debug = options.debug === true
  const defaultHeaders: Record<string, string> = { "Content-Type": "application/json" }

  // create or validate token
  // define headers for authentication
  const authHeaders: Record<string, string> = { ...defaultHeaders }

  // if authConfig includes a token id and no scope, we use the get method to validate the token
  // otherwise, we create a new token
  let response: Response

  if ("token" in authConfig.auth.identity && authConfig.auth.identity.token.id && !authConfig.auth.scope) {
    // Validate the token
    authHeaders["X-Auth-Token"] = authConfig.auth.identity.token.id
    authHeaders["X-Subject-Token"] = authConfig.auth.identity.token.id
    response = await get(endpoint, { headers: authHeaders, debug: debug })
  } else {
    // Create a new token
    response = await post(endpoint, authConfig, { headers: authHeaders, debug: debug })
  }

  const authToken = response.headers.get("X-Subject-Token")
  if (!authToken) throw new AuroraSignalError("Could not retrieve auth token")

  const data = await response.json()
  let token: AuroraSignalTokenType | undefined = AuroraSignalToken({
    tokenData: data.token,
    authToken: response.headers.get("X-Subject-Token")!,
  })

  function isValid() {
    return token?.authToken && !token.isExpired()
  }

  // public functions
  async function terminate() {
    if (isValid()) {
      await del(endpoint, { headers: { "X-Auth-Token": token!.authToken } })
    }
    token = undefined
  }

  async function rescope(scope: AuthConfig["auth"]["scope"]) {
    if (!token) throw new AuroraSignalError("No valid token available")
    const rescopeConfig = { auth: { identity: { methods: ["token"], token: { id: token.authToken } }, scope } }
    const response = await post(endpoint, rescopeConfig, {
      headers: { ...defaultHeaders, "X-Auth-Token": token.authToken },
      debug: debug,
    })
    const data = await response.json()
    token = AuroraSignalToken({
      tokenData: data.token,
      authToken: response.headers.get("X-Subject-Token")!,
    })
  }

  function getToken() {
    if (!isValid()) throw new AuroraSignalError("No valid token available")
    return token
  }

  function service(name: string, serviceDefaultOptions: AuroraSignalOptions = {}) {
    if (!isValid()) throw new AuroraSignalError("No valid token available")
    return AuroraSignalService(name, token!, { ...defaultHeaders, ...options, ...serviceDefaultOptions })
  }

  // expose the public functions
  return {
    service,
    terminate,
    rescope,
    getToken,
    isValid,
  }
}

export type AuroraSignalSessionType = ReturnType<typeof AuroraSignalSession>
