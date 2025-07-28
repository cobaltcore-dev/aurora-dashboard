import { createClient } from "@cloudoperators/juno-k8s-client"
import dotenv from "dotenv"
dotenv.config()

interface GetClientParams {
  region?: string
  token: string
}

// Disable TLS certificate verification for development purposes
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"
const apiEndpoint = process.env.GARDENER_ENDPOINT || ""

export const getClient = ({ region, token }: GetClientParams) =>
  createClient({
    apiEndpoint: apiEndpoint.replace("%REGION%", region || "qa-de-1"),
    token: process.env.GARDENER_TOKEN || token,
  })
