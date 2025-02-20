type AuthCredentialsIdentity =
  | { userId: string; password: string; userDomainId: string }
  | { userId: string; password: string; userDomainName: string }
  | { userName: string; password: string; userDomainId: string }
  | { userName: string; password: string; userDomainName: string }
  | { applicationId: string; applicationSecret: string }
  | { token: string }

type AuthCredentialsScope =
  | { scope: "unscoped" }
  | { scopeDomainId: string }
  | { scopeDomainName: string }
  | { scopeProjectId: string }
  | {
      scopeProjectName: string
      scopeProjectDomainId: string
    }
  | {
      scopeProjectName: string
      scopeProjectDomainName: string
    }

export type AuthCredentials = AuthCredentialsIdentity & Partial<AuthCredentialsScope>

type AuthConfigUser = { name: string } | { id: string }
type AuthConfigDomain = { name: string } | { id: string }

type AuthConfigIdentity =
  | {
      methods: ["password"]
      password: {
        user: AuthConfigUser & { password: string; domain?: AuthConfigDomain }
      }
    }
  | { methods: ["token"]; token: { id: string } }
  | { methods: ["application_credential"]; application_credential: { id: string; secret: string } }

type AuthConfigScope =
  | { project: { id: string } }
  | { project: { name: string; domain: AuthConfigDomain } }
  | { domain: AuthConfigDomain }
  | "unscoped"

export interface AuthConfig {
  auth: {
    identity: AuthConfigIdentity
    scope?: AuthConfigScope
  }
}

/**
 * Convert auth config to keystone authentication object
 * @param {object} authConf an object which can contain
 * possible properties:
 * - token: a valid keystone auth token. If token is given, no further information is necessary
 * - userId: user ID
 * - userName: user name, only one of the two is necessary userId or userName
 * - userDomainId: domain id where the user is registered
 * - userDomainName: domain name where the user is registered, only one of the two is necessary userDomainId or userDomainName
 * - password: user password
 *
 * - scopeProjectId: project ID. If this parameter is given no further scope information is neccessary (project scope)
 * - scopeProjectName: project name. In this case scopeProjectDomainID or scopeProjectDomainName are neccessary. (project scope)
 * - scopeProjectDomainId: project domain id (project scope)
 * - scopeProjectDomainName: project domain name (project scope)
 * - scopeDomainId: domain id (domain scope)
 * - scopeDomainName: domain name (domain scope)
 */
export function convertAuthConfigToKeystoneAuthObject(authConf: AuthCredentials): AuthConfig {
  const userDomain =
    "userDomainId" in authConf
      ? { id: authConf.userDomainId }
      : "userDomainName" in authConf
        ? { name: authConf.userDomainName }
        : undefined

  const identity: AuthConfigIdentity | undefined =
    "token" in authConf
      ? { methods: ["token"], token: { id: authConf.token } }
      : "applicationId" in authConf
        ? {
            methods: ["application_credential"],
            application_credential: { id: authConf.applicationId, secret: authConf.applicationSecret },
          }
        : {
            methods: ["password"],
            password: {
              user:
                "userId" in authConf
                  ? { id: authConf.userId, password: authConf.password, domain: userDomain }
                  : { name: authConf.userName, password: authConf.password, domain: userDomain },
            },
          }

  const scope: AuthConfigScope | undefined =
    "scope" in authConf && authConf.scope === "unscoped"
      ? "unscoped"
      : "scopeProjectId" in authConf && authConf.scopeProjectId
        ? { project: { id: authConf.scopeProjectId } }
        : "scopeProjectName" in authConf && authConf.scopeProjectName
          ? "scopeProjectDomainId" in authConf && authConf.scopeProjectDomainId
            ? { project: { name: authConf.scopeProjectName, domain: { id: authConf.scopeProjectDomainId } } }
            : "scopeProjectDomainName" in authConf && authConf.scopeProjectDomainName
              ? { project: { name: authConf.scopeProjectName, domain: { name: authConf.scopeProjectDomainName } } }
              : undefined
          : "scopeDomainId" in authConf && authConf.scopeDomainId
            ? { domain: { id: authConf.scopeDomainId } }
            : "scopeDomainName" in authConf && authConf.scopeDomainName
              ? { domain: { name: authConf.scopeDomainName } }
              : undefined

  return { auth: { identity, scope } }
}
