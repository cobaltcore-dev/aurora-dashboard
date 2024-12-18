import { Mutation, Resolver, Args, ArgsType, Field, Ctx } from "type-graphql"
import { BaseContext } from "../../types/context"
import { Token } from "../models/Token"
import { OpenstackIdentityAPI } from "../apis/openstack"
import { setSessionData } from "../../sessionCookieHandler"

interface IdentityContext extends BaseContext {
  dataSources: {
    openstack: {
      identity: OpenstackIdentityAPI
    }
  }
}

@ArgsType()
class AuthenticateArgs {
  @Field(() => String)
  domain!: string

  @Field(() => String)
  user!: string

  @Field(() => String)
  password!: string
}

@Resolver()
export class TokenResolver {
  @Mutation(() => Token)
  async login(
    @Args(() => AuthenticateArgs) { domain, user, password }: AuthenticateArgs,
    @Ctx() ctx: IdentityContext
  ): Promise<Token> {
    // Authenticate with OpenStack Keystone and get the token
    const { token, authToken } = await ctx.dataSources.openstack.identity.createToken(domain, user, password)

    if (!authToken) {
      throw new Error("Invalid credentials")
    }

    // Set the token as a cookie
    setSessionData(ctx.res, authToken)
    return Object.assign(new Token(), token)
  }
}
