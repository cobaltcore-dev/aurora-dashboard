import { Query, Resolver } from "type-graphql"
import { Instance } from "../models/Instance"
import ComputeAPI from "../compute-api"

@Resolver()
export class InstanceResolver {
  @Query(() => [Instance])
  async instances(): Promise<Instance[]> {
    return new ComputeAPI().getServers().then((response) => {
      return response.servers.map((server: { id: string; name: string }) => new Instance(server))
    })
  }
}
