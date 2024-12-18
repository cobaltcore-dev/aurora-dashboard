import { RESTDataSource } from "@apollo/datasource-rest"

interface TokenResponse {
  token: object
}

interface CreateTokenResult extends TokenResponse {
  authToken: string | null
}

export class OpenstackIdentityAPI extends RESTDataSource {
  // Sets the base URL for the REST API
  override baseURL = process.env.OPENSTACK_IDENTITY_ENDPOINT

  async createToken(domain: string, user: string, password: string): Promise<CreateTokenResult> {
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

    const data = parsedBody as TokenResponse
    return { ...data, authToken: response.headers.get("X-Subject-Token") }
  }
}
