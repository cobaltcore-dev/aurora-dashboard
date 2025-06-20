import { FastifyRequest, FastifyReply } from "fastify"
import { SessionCookie } from "./sessionCookie"

export async function restoreSessionFromToken(req: FastifyRequest, res: FastifyReply) {
  // This endpoint receives a auth token, validates it and sets the session cookie
  const { authToken, redirectUrl = "/" } = req.body as { authToken: string; redirectUrl?: string }

  if (!authToken) {
    return res.status(400).send({ error: "authToken is required" })
  }

  const sessionCookie = SessionCookie({ req, res })
  sessionCookie.set(authToken)
  res.redirect(redirectUrl) // Redirect to the specified URL after setting the session
}
