type SessionCookieName = "polaris-session"

export type Request = {
  cookies?: { [key in SessionCookieName]?: string }
}

export type Response = {
  // Define the `cookie` method for setting cookies
  cookie: (
    name: SessionCookieName,
    value: string,
    options: {
      httpOnly?: boolean // Standard cookie options
      secure?: boolean
      sameSite?: "strict" | "lax" | "none"
      maxAge?: number
      domain?: string
      path?: string
    }
  ) => void
}

export interface Context {
  req: Request
  res: Response
  authToken?: string
}
