import { IncomingMessage, ServerResponse } from "http"
import { SessionCookieName } from "./types/baseContext"

export class SessionCookieHandler {
  private cookieName: SessionCookieName
  private req: IncomingMessage
  private res: ServerResponse

  constructor(params: { req: IncomingMessage; res: ServerResponse }) {
    this.cookieName = "polaris-session"
    this.req = params.req
    this.res = params.res
  }

  getSessionAuthToken() {
    // Extract the auth token from cookies
    const authToken = this.req.headers.cookie
      ?.split(";")
      .find((c) => c.trim().startsWith(`${this.cookieName}=`))
      ?.split("=")[1]

    // Attach the token to the context for downstream resolvers
    return authToken
  }

  clearSessionCookie() {
    this.res.setHeader("Set-Cookie", `${this.cookieName}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0`)
  }

  setSessionAuthToken(authToken: string) {
    this.res.setHeader("Set-Cookie", `${this.cookieName}=${authToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
  }
}
