import type { AuthConfig, AuthCredentials } from "./auth-config"
import { AuroraSignalTokenType, AuroraSignalToken } from "./token"
import { convertAuthConfigToKeystoneAuthObject } from "./auth-config"
import { del, post } from "./client"
import { AuroraSignalError } from "./error"

export class Session {
  private debug: boolean = false
  private authConfig: AuthConfig
  private endpoint: string
  private headers: Record<string, string> = { "Content-Type": "application/json" }
  private token?: AuroraSignalTokenType

  constructor(endpoint: string, authCredentials: AuthCredentials, debug?: boolean) {
    this.debug = debug === true
    this.authConfig = convertAuthConfigToKeystoneAuthObject(authCredentials)
    this.endpoint = new URL("/v3/auth/tokens", endpoint).toString()
    const methods: Array<string> = this.authConfig.auth.identity?.methods || []

    if (methods.includes("token") && "token" in this.authConfig.auth.identity) {
      this.headers["X-Auth-Token"] = this.authConfig.auth.identity.token.id
      this.headers["X-Subject-Token"] = this.authConfig.auth.identity.token.id
    }
  }

  private async authenticate() {
    // If we already have a valid token, we don't need to create a new one
    if (this.token?.isExpired === false) {
      return this
    }

    const response = await post(this.endpoint, this.authConfig, { headers: this.headers, debug: this.debug })

    const authToken = response.headers.get("X-Subject-Token")
    if (!authToken) {
      throw new AuroraSignalError("No auth token found in response")
    }
    const data = await response.json()
    this.token = new AuroraSignalToken(data.token, response.headers.get("X-Subject-Token")!)
  }

  async terminate() {
    if (this.token) {
      await del(this.endpoint, { headers: { "X-Auth-Token": this.token.authToken } })
      this.token = undefined
    }
  }

  async getToken(): Promise<AuroraSignalTokenType | undefined> {
    await this.authenticate()
    return this.token
  }
}

export type AuroraSignalSession = InstanceType<typeof Session>
