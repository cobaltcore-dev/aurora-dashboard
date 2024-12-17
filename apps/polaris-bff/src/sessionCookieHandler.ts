import { Request, Response } from "./types"

export const getSessionData = (req: Request) => {
  let authToken = ""
  // Extract the auth token from cookies
  console.log("value", req.headers?.cookie)
  req.headers?.cookie?.split(";").forEach((cookie) => {
    const [key, value] = cookie.split("=")
    if (key.trim() === "polaris-session") {
      authToken = value.trim()
      return
    }
  })

  // if (!authToken) {
  //   throw new Error("Authentication required")
  // }

  // Attach the token to the context for downstream resolvers
  return { authToken }
}

export const clearSessionData = (res: Response) => {
  // Clear the auth token cookie
  res.cookie("polaris-session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
  })
}

export const setSessionData = (res: Response, authToken: string) => {
  // Set the auth token cookie
  res.cookie("polaris-session", authToken, {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "none",
    domain: ".cloud.sap",
    maxAge: 3600 * 1000,
  })
}
