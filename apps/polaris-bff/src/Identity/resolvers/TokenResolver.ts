import { Mutation, Resolver, Arg } from "type-graphql"
import { Token } from "../models/Token"
import IdentityAPI from "../identity-api"

@Resolver()
export class TokenResolver {
  @Mutation(() => Token)
  async authenticate(
    @Arg("domain", () => String) domain: string,
    @Arg("user", () => String) user: string,
    @Arg("password", () => String) password: string
  ): Promise<Token> {
    const data = await new IdentityAPI().createToken(domain, user, password)
    const tokenData = { ...data.token, authToken: data.authToken }
    return Object.assign(new Token(), tokenData) // Create Token in resolver
  }
}
