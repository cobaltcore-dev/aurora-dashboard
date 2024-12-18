import { IncomingMessage, ServerResponse } from "http"
import { APIs } from "./apis"

export type SessionCookieName = "polaris-session"

export interface BaseContext {
  req: IncomingMessage
  res: ServerResponse
  authToken?: string
  dataSources: APIs
  setAuthToken: (authToken: string) => void
  clearSessionCookie: () => void
}
