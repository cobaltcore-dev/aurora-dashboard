import { createClient } from "@cloudoperators/juno-k8s-client"
import dotenv from "dotenv"
dotenv.config()

export const client = createClient({
  apiEndpoint: process.env.GARDENER_ENDPOINT!,
  token: process.env.GARDENER_TOKEN!,
})
