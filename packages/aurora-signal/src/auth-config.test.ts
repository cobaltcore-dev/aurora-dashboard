import { convertAuthConfigToKeystoneAuthObject } from "./auth-config"

/**
 * Convert auth config to keystone authentication object
 * possible properties:
 * AUTH
 * - token: a valid keystone auth token. If token is given, no further information is necessary
 * - userId: user ID
 * - userName: user name, only one of the two is necessary userId or userName
 * - userDomainId: domain id where the user is registered
 * - userDomainName: domain name where the user is registered, only one of the two is necessary userDomainId or userDomainName
 * - password: user password
 * SCOPE
 * - scopeProjectId: project ID. If this parameter is given no further scope information is neccessary (project scope)
 * - scopeProjectName: project name. In this case scopeProjectDomainID or scopeProjectDomainName are neccessary. (project scope)
 * - scopeProjectDomainId: project domain id (project scope)
 * - scopeProjectDomainName: project domain name (project scope)
 * - scopeDomainId: domain id (domain scope)
 * - scopeDomainName: domain name (domain scope)
 */

describe("auth-config", () => {
  it("should convert userName, password, userDomainName credentials", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      userName: "user",
      password: "password",
      userDomainName: "domain",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              name: "user",
              password: "password",
              domain: { name: "domain" },
            },
          },
        },
      },
    })
  })

  it("should convert userName, password, userDomainId credentials", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      userName: "user",
      password: "password",
      userDomainId: "domain",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              name: "user",
              password: "password",
              domain: { id: "domain" },
            },
          },
        },
      },
    })
  })

  it("should convert userId, password, userDomainName credentials", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      userId: "user",
      password: "password",
      userDomainName: "domain",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              id: "user",
              password: "password",
              domain: { name: "domain" },
            },
          },
        },
      },
    })
  })

  it("should convert userId, password, userDomainId credentials", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      userId: "user",
      password: "password",
      userDomainId: "domain",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              id: "user",
              password: "password",
              domain: { id: "domain" },
            },
          },
        },
      },
    })
  })

  it("should convert applicationId, applicationSecret credentials", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      applicationId: "id",
      applicationSecret: "secret",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["application_credential"],
          application_credential: { id: "id", secret: "secret" },
        },
      },
    })
  })

  it("should convert userId, password, userDomainId credentials and scopeProjectId", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      userId: "user",
      password: "password",
      userDomainId: "domain",
      scopeProjectId: "project",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              id: "user",
              password: "password",
              domain: { id: "domain" },
            },
          },
        },
        scope: {
          project: { id: "project" },
        },
      },
    })
  })

  it("should convert userId, password, userDomainId credentials and scopeProjectName, scopeProjectDomainId", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      userId: "user",
      password: "password",
      userDomainId: "domain",
      scopeProjectName: "project",
      scopeProjectDomainId: "domain",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              id: "user",
              password: "password",
              domain: { id: "domain" },
            },
          },
        },
        scope: {
          project: { name: "project", domain: { id: "domain" } },
        },
      },
    })
  })

  it("should convert userId, password, userDomainId credentials and scopeProjectName, scopeProjectDomainName", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      userId: "user",
      password: "password",
      userDomainId: "domain",
      scopeProjectName: "project",
      scopeProjectDomainName: "domain",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              id: "user",
              password: "password",
              domain: { id: "domain" },
            },
          },
        },
        scope: {
          project: { name: "project", domain: { name: "domain" } },
        },
      },
    })
  })

  it("should convert userId, password, userDomainId credentials and scopeDomainId", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      userId: "user",
      password: "password",
      userDomainId: "domain",
      scopeDomainId: "domain",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              id: "user",
              password: "password",
              domain: { id: "domain" },
            },
          },
        },
        scope: {
          domain: { id: "domain" },
        },
      },
    })
  })

  it("should convert userId, password, userDomainId credentials and scopeDomainName", () => {
    const result = convertAuthConfigToKeystoneAuthObject({
      userId: "user",
      password: "password",
      userDomainId: "domain",
      scopeDomainName: "domain",
    })

    expect(result).toEqual({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              id: "user",
              password: "password",
              domain: { id: "domain" },
            },
          },
        },
        scope: {
          domain: { name: "domain" },
        },
      },
    })
  })
})
