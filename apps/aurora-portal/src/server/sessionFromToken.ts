import { FastifyRequest, FastifyReply } from "fastify"
import { SessionCookie } from "./sessionCookie"

export async function restoreSessionFromToken(req: FastifyRequest, res: FastifyReply) {
  // This endpoint receives a auth token, validates it and sets the session cookie
  const { authToken, redirectUrl = "/" } = req.body as { authToken: string; redirectUrl?: string }

  if (!authToken) {
    return res.status(400).send({ error: "authToken is required" })
  }
  // Here you would typically validate the authToken with your authentication service

  const sessionCookie = SessionCookie({ req, res })
  sessionCookie.set(authToken)
  res.redirect(redirectUrl) // Redirect to the specified URL after setting the session
}

export async function restoreSessionFromTokenGet(req: FastifyRequest, res: FastifyReply) {
  // This endpoint receives a auth token as query parameter, validates it and sets the session cookie
  const query = req.query as { authToken?: string; redirectUrl?: string }
  const { authToken, redirectUrl = "/" } = query
  if (!authToken) {
    return res.status(400).send({ error: "authToken is required" })
  }

  const sessionCookie = SessionCookie({ req, res })
  sessionCookie.set(authToken)
  res.redirect(redirectUrl) // Redirect to the specified URL after setting the session
}
