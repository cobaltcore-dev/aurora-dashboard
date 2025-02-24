import { AuthConfig, AuthSchema } from "./auth-config"

describe("auth-config", () => {
  it("should validate password authentication with unscoped authorization", () => {
    const authConfig: AuthConfig = {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              name: "admin",
              domain: {
                name: "Default",
              },
              password: "devstacker",
            },
          },
        },
      },
    }
    expect(AuthSchema.safeParse(authConfig)).toEqual({ success: true, data: authConfig })
  })

  it("should validate Password authentication with scoped authorization", () => {
    const authConfig: AuthConfig = {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              name: "admin",
              domain: {
                name: "Default",
              },
              password: "devstacker",
            },
          },
        },
        scope: {
          project: {
            name: "admin",
            domain: {
              name: "Default",
            },
          },
        },
      },
    }
    expect(AuthSchema.safeParse(authConfig)).toEqual({ success: true, data: authConfig })
  })

  it("should validate Password authentication with explicit unscoped authorization", () => {
    const authConfig: AuthConfig = {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              id: "ee4dfb6e5540447cb3741905149d9b6e",
              password: "devstacker",
            },
          },
        },
        scope: "unscoped",
      },
    }
    expect(AuthSchema.safeParse(authConfig)).toEqual({ success: true, data: authConfig })
  })

  it("should validate Token authentication with unscoped authorization", () => {
    const authConfig: AuthConfig = {
      auth: {
        identity: {
          methods: ["token"],
          token: {
            id: "'$OS_TOKEN'",
          },
        },
      },
    }
    expect(AuthSchema.safeParse(authConfig)).toEqual({ success: true, data: authConfig })
  })

  it("should validate Token authentication with scoped authorization", () => {
    const authConfig: AuthConfig = {
      auth: {
        identity: {
          methods: ["token"],
          token: {
            id: "'$OS_TOKEN'",
          },
        },
        scope: {
          system: {
            all: true,
          },
        },
      },
    }
    expect(AuthSchema.safeParse(authConfig)).toEqual({ success: true, data: authConfig })
  })

  it("should validate Token authentication with explicit unscoped authorization", () => {
    const authConfig: AuthConfig = {
      auth: {
        identity: {
          methods: ["token"],
          token: {
            id: "'$OS_TOKEN'",
          },
        },
        scope: "unscoped",
      },
    }
    expect(AuthSchema.safeParse(authConfig)).toEqual({ success: true, data: authConfig })
  })

  it("should validate Authenticating with an Application Credential", () => {
    const authConfig: AuthConfig = {
      auth: {
        identity: {
          methods: ["application_credential"],
          application_credential: {
            id: "423f19a4ac1e4f48bbb4180756e6eb6c",
            secret: "rEaqvJka48mpv",
          },
        },
      },
    }
    expect(AuthSchema.safeParse(authConfig)).toEqual({ success: true, data: authConfig })
  })

  it("should validate Authenticating with an Application Credential by user id", () => {
    const authConfig: AuthConfig = {
      auth: {
        identity: {
          methods: ["application_credential"],
          application_credential: {
            name: "monitoring",
            secret: "rEaqvJka48mpv",
            user: {
              id: "423f19a4ac1e4f48bbb4180756e6eb6c",
            },
          },
        },
      },
    }
    expect(AuthSchema.safeParse(authConfig)).toEqual({ success: true, data: authConfig })
  })
})
