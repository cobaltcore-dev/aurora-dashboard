import { AugmentedRequest, CacheOptions, RESTDataSource } from "@apollo/datasource-rest"
import { ValueOrPromise } from "@apollo/datasource-rest/dist/RESTDataSource"

export class OpenstackComputeAPI extends RESTDataSource {
  override baseURL = "https://compute-3.qa-de-1.cloud.sap:443/v2/e9141fb24eee4b3e9f25ae69cda31132/"
  private token = ""

  protected willSendRequest(path: string, requestOpts: AugmentedRequest<CacheOptions>): ValueOrPromise<void> {
    requestOpts.headers["X-Auth-Token"] = this.token
  }

  getServers() {
    return this.get("servers")
  }
}
