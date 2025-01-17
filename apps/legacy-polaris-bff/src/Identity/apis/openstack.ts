import { RESTDataSource } from "@apollo/datasource-rest"
import { Token } from "../models/Token"

interface TokenResponse {
  token: unknown
  authToken: string | null
}

export class OpenstackIdentityAPI extends RESTDataSource {
  // Sets the base URL for the REST API
  override baseURL = process.env.OPENSTACK_IDENTITY_ENDPOINT

  async createToken(domain: string, user: string, password: string): Promise<TokenResponse> {
    const { response, parsedBody } = await this.fetch("auth/tokens", {
      method: "POST",
      body: {
        auth: {
          identity: {
            methods: ["password"],
            password: {
              user: {
                domain: { name: domain },
                name: user,
                password: password,
              },
            },
          },
        },
      },
      headers: {
        "Content-Type": "application/json",
      },
    })

    return { token: parsedBody, authToken: response.headers.get("X-Subject-Token") }
  }

  async validateToken(authToken: string): Promise<Token | null> {
    try {
      const response = await this.get("auth/tokens", {
        headers: {
          "X-Auth-Token": authToken,
          "X-Subject-Token": authToken,
        },
      })

      return response.token
    } catch (error) {
      console.error(error)
      return null
    }
  }
}
