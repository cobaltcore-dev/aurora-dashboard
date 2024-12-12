import { Mutation, Resolver, Args, ArgsType, Field, Ctx } from "type-graphql"
import { Token } from "../models/Token"
import { OsIdentityAPI } from "../apis"

interface Context {
  dataSources: {
    osIdentityAPI: OsIdentityAPI
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
  async authenticate(@Args(() => AuthenticateArgs) data: AuthenticateArgs, @Ctx() ctx: Context): Promise<Token> {
    const { token, authToken } = await ctx.dataSources.osIdentityAPI.createToken(data.domain, data.user, data.password)
    const tokenData = { ...token, authToken }
    return Object.assign(new Token(), tokenData) // Create Token in resolver
  }
}
