import { Mutation, Resolver, Args, ArgsType, Field, Ctx } from "type-graphql"
import { Token } from "../models/Token"
import { OsIdentityAPI } from "../apis/openstack"

type VariantType = "polaris-session"
interface Context {
  dataSources: {
    osIdentityAPI: OsIdentityAPI
  }
  res: {
    cookie: (name: VariantType, body: string, options: { [subject: string]: string | boolean | number }) => void
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
    @Ctx() ctx: Context
  ): Promise<Token> {
    // Authenticate with OpenStack Keystone and get the token
    const { token, authToken } = await ctx.dataSources.osIdentityAPI.createToken(domain, user, password)

    if (!authToken) {
      throw new Error("Invalid credentials")
    }

    ctx.res.cookie("polaris-session", authToken, {
      httpOnly: true, // Prevent JavaScript access
      secure: true, // Send only over HTTPS
      sameSite: "strict", // Protect against CSRF
      maxAge: 3600 * 1000, // Set token expiration (1 hour, in ms)
    })
    // ctx.res.headers.set("Set-Cookie", `authToken=${authToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)

    return Object.assign(new Token(), token)
  }
}
