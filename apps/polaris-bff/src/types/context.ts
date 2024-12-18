type SessionCookieName = "polaris-session"

export type PolarisRequest = {
  cookies?: { [key in SessionCookieName]?: string }
}

export type PolarisResponse = {
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

export interface BaseContext {
  req: PolarisRequest
  res: PolarisResponse
  authToken?: string
}
