import { RESTDataSource } from "@apollo/datasource-rest"
import * as dotenv from "dotenv"

// Load environment variables from .env file
dotenv.config()

interface TokenResponse {
  token: object
}

interface CreateTokenResult extends TokenResponse {
  authToken: string | null
}

class IdentityAPI extends RESTDataSource {
  override baseURL = process.env.IDENTITY_API_URL

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

export default IdentityAPI
