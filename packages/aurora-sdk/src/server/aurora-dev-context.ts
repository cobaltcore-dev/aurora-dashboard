import { AuroraContext, Token } from "./aurora-context"

export async function createAuroraOpenstackDevContext(params: CredentialsParams) {
  const { authToken, token } = await createToken(params)

  return async function createContext(): Promise<AuroraContext> {
    return {
      authToken,
      validateAuthToken: async () => {
        return token
      },
    }
  }
}

type CredentialsParams = {
  domain: string
  user: string
  password: string
  scope?: {
    domain: {
      id: string
      name: string
    }
    project: {
      id?: string
      name?: string
    }
  }
}

const createToken = async (params: CredentialsParams): Promise<{ authToken: string; token: Token }> => {
  console.log(params)
  return {
    authToken: "test",

    token: {
      audit_ids: ["3T2dc1CGQxyJsHdDu1xkcw"],
      catalog: [
        {
          endpoints: [
            {
              id: "068d1b359ee84b438266cb736d81de97",
              interface: "public",
              region: "RegionOne",
              region_id: "RegionOne",
              url: "http://example.com/identity",
            },
            {
              id: "8bfc846841ab441ca38471be6d164ced",
              interface: "admin",
              region: "RegionOne",
              region_id: "RegionOne",
              url: "http://example.com/identity",
            },
            {
              id: "beb6d358c3654b4bada04d4663b640b9",
              interface: "internal",
              region: "RegionOne",
              region_id: "RegionOne",
              url: "http://example.com/identity",
            },
          ],
          type: "identity",
          id: "050726f278654128aba89757ae25950c",
          name: "keystone",
        },
      ],
      expires_at: "2015-11-07T02:58:43.578887Z",
      issued_at: "2015-11-07T01:58:43.578929Z",
      methods: ["password"],
      roles: [
        {
          id: "51cc68287d524c759f47c811e6463340",
          name: "admin",
        },
      ],
      system: {
        all: true,
      },
      user: {
        domain: {
          id: "default",
          name: "Default",
        },
        id: "ee4dfb6e5540447cb3741905149d9b6e",
        name: "admin",
        password_expires_at: "2016-11-06T15:32:17.000000",
      },
    },
  }
}
