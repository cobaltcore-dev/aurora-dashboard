import type { AuthCredentials } from "./auth-config"
import type { AuroraSignalOptions } from "./shared-types"
import { AuroraSignalTokenType, AuroraSignalToken } from "./token"
import { convertAuthConfigToKeystoneAuthObject } from "./auth-config"
import { del, post, head } from "./client"
import { Service } from "./service"
import { AuroraSignalError } from "./error"

// validateTokenMode checks if the credentials are in token mode and no scope is defined
const checkTokenInValidateMode = (credentials: AuthCredentials): boolean => {
  return (
    "token" in credentials &&
    !("scope" in credentials) &&
    !("scopeProjectId" in credentials) &&
    !("scopeProjectName" in credentials) &&
    !("scopeProjectDomainId" in credentials) &&
    !("scopeProjectDomainName" in credentials) &&
    !("scopeDomainId" in credentials) &&
    !("scopeDomainName" in credentials)
  )
}

// This Options pre-define the region, interfaceName, and debug for the whole session
export function AuroraSignalSession(
  identityEndpoint: string,
  authCredentials: AuthCredentials,
  options: AuroraSignalOptions = {}
) {
  const debug = options.debug === true
  const defaultHeaders: Record<string, string> = { "Content-Type": "application/json" }
  const authConfig = convertAuthConfigToKeystoneAuthObject(authCredentials)
  const endpoint = new URL("/v3/auth/tokens", identityEndpoint).toString()
  const validateTokenMode = checkTokenInValidateMode(authCredentials)

  let token: AuroraSignalTokenType | undefined = undefined

  // private function authenticate
  const authenticate = async () => {
    // If we already have a valid token, we don't need to create a new one
    if (token?.isExpired === false) return

    const authHeaders: Record<string, string> = { ...defaultHeaders }

    let response: Response

    if (validateTokenMode && "token" in authConfig.auth.identity) {
      authHeaders["X-Auth-Token"] = authConfig.auth.identity.token.id
      authHeaders["X-Subject-Token"] = authConfig.auth.identity.token.id
      response = await head(endpoint, { headers: authHeaders, debug: debug })
    } else {
      response = await post(endpoint, authConfig, { headers: authHeaders, debug: debug })
    }

    const authToken = response.headers.get("X-Subject-Token")
    if (!authToken) {
      throw new AuroraSignalError("Could not retrieve auth token")
    }
    const data = await response.json()
    token = new AuroraSignalToken(data.token, response.headers.get("X-Subject-Token")!)
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
    return Service(name, token, { ...defaultHeaders, ...options, ...serviceDefaultOptions })
  }

  // expose the public functions
  return {
    service,
    terminate,
    getToken,
  }
}
