import { IncomingMessage, ServerResponse } from "http"
import { SessionCookieName } from "./types/baseContext"

const cookieName: SessionCookieName = "polaris-session"
export class SessionCookieHandler {
  private req: IncomingMessage
  private res: ServerResponse

  constructor(params: { req: IncomingMessage; res: ServerResponse }) {
    this.req = params.req
    this.res = params.res
  }

  getSessionAuthToken() {
    // Extract the auth token from cookies
    const authToken = this.req.headers.cookie
      ?.split(";")
      .find((c) => c.trim().startsWith(`${cookieName}=`))
      ?.split("=")[1]

    // Attach the token to the context for downstream resolvers
    return authToken
  }

  clearSessionCookie() {
    this.res.setHeader("Set-Cookie", `${cookieName}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0`)
  }

  setSessionAuthToken(authToken: string) {
    this.res.setHeader("Set-Cookie", `${cookieName}=${authToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
  }
}
