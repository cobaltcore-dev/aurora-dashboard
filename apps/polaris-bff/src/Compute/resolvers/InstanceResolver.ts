import { Query, Resolver, Ctx } from "type-graphql"
import { Instance } from "../models/Instance"
import { OsComputeAPI } from "../apis/openstack"

interface Context {
  dataSources: {
    osComputeAPI: OsComputeAPI
  }
}

@Resolver()
export class InstanceResolver {
  @Query(() => [Instance])
  async instances(@Ctx() ctx: Context): Promise<Instance[]> {
    return ctx.dataSources.osComputeAPI.getServers().then((response) => {
      return response.servers.map((server: { id: string; name: string }) => new Instance(server))
    })
  }
}
