import { createClient } from "@cloudoperators/juno-k8s-client"
import dotenv from "dotenv"
dotenv.config()

export const client = createClient({
  apiEndpoint: process.env.GARDENER_ENDPOINT || "https://api.gardener.cloud",
  token: process.env.GARDENER_TOKEN || "123456",
})

export type K8sClient = typeof client
