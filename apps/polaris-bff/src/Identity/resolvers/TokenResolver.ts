import { Mutation, Query, Resolver, Args, ArgsType, Field, Ctx } from "type-graphql"
import type { BaseContext } from "../../types/baseContext"
import { Token } from "../models/Token"

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
    @Ctx() ctx: BaseContext
  ): Promise<Token> {
    // Authenticate with OpenStack Keystone and get the token
    const { token, authToken } = await ctx.dataSources.openstack.identity.createToken(domain, user, password)

    if (!authToken) {
      throw new Error("Invalid credentials")
    }

    // Set the token as a cookie
    ctx.setAuthToken(authToken)
    return token
  }

  @Query(() => Token || null)
  async token(@Ctx() ctx: BaseContext): Promise<Token | null | undefined> {
    if (!ctx.authToken) {
      return null
    }
    const token = await ctx.dataSources.openstack.identity.validateToken(ctx.authToken)
    return token as Token
  }
}
