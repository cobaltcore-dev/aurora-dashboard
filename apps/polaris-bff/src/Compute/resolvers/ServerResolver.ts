import { Query, Resolver, Ctx } from "type-graphql"
import type { BaseContext } from "../../types/baseContext"
import { Server } from "../models/Server"

@Resolver()
export class ServerResolver {
  @Query(() => [Server])
  async servers(@Ctx() ctx: BaseContext): Promise<Server[]> {
    return ctx.dataSources.openstack.compute.getServers().then((response) => response.servers)
  }
}
