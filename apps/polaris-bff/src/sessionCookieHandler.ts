import { PolarisRequest, PolarisResponse } from "./types/context"

export const getSessionData = (req: PolarisRequest) => {
  // Extract the auth token from cookies
  const authToken = req.cookies?.["polaris-session"]

  // Attach the token to the context for downstream resolvers
  return { authToken }
}

export const clearSessionData = (res: PolarisResponse) => {
  // Clear the auth token cookie
  res.cookie("polaris-session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
  })
}

export const setSessionData = (res: PolarisResponse, authToken: string) => {
  // Set the auth token cookie
  res.cookie("polaris-session", authToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 3600 * 1000,
  })
}
