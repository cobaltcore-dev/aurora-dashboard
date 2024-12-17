import { AugmentedRequest, CacheOptions, RESTDataSource } from "@apollo/datasource-rest"
import { ValueOrPromise } from "@apollo/datasource-rest/dist/RESTDataSource"

export class OpenstackComputeAPI extends RESTDataSource {
  override baseURL = ""
  private token = ""

  protected willSendRequest(path: string, requestOpts: AugmentedRequest<CacheOptions>): ValueOrPromise<void> {
    requestOpts.headers["X-Auth-Token"] = this.token
  }

  getServers() {
    return this.get("servers")
  }
}
