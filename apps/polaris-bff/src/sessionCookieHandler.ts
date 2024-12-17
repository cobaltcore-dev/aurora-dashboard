import { Request, Response } from "./types"

export const getSessionData = (req: Request) => {
  // Extract the auth token from cookies
  const authToken = req.cookies?.["polaris-session"]

  // if (!authToken) {
  //   throw new Error("Authentication required")
  // }

  console.log("===================================")
  console.log(authToken)

  // Attach the token to the context for downstream resolvers
  return { authToken }
}

export const clearSessionData = (res: Response) => {
  // Clear the auth token cookie
  res.cookie("polaris-session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
  })
}

export const setSessionData = (res: Response, authToken: string) => {
  // Set the auth token cookie
  res.cookie("polaris-session", authToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 3600 * 1000,
  })
}
