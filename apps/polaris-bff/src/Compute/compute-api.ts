import { AugmentedRequest, CacheOptions, RESTDataSource } from "@apollo/datasource-rest"
import { ValueOrPromise } from "@apollo/datasource-rest/dist/RESTDataSource"

class ComputeAPI extends RESTDataSource {
  override baseURL = "https://compute-3.qa-de-1.cloud.sap:443/v2/e9141fb24eee4b3e9f25ae69cda31132/"
  private token =
    "gAAAAABnRxc6OzYDfxS0sP__p66nd9kMxchgFBfBJaBLJbx3EV62ewGE2WQ7xpK3QsJcsy5Rz4Sc0IksgHbyqaN0089brLlH52u_3x0EWoLJy891GBmLmqqRvHMYWLbHYfJ3TT1xXK_VzbKfSV6LGm-hxP0QQferXTW6Rfzdt4Ta8f6BCm-3cc9SUozshGy_YyK-nQbvVZcSUEtd2-g_GHcyQDHu9cRhLT4KFiK7M37L8gNO4LZytfV6g-CTBSxjQBiFeeLmuRfZ"

  protected willSendRequest(path: string, requestOpts: AugmentedRequest<CacheOptions>): ValueOrPromise<void> {
    requestOpts.headers["X-Auth-Token"] = this.token
  }

  getServers() {
    return this.get("servers")
  }
}

export default ComputeAPI
