import { appRouter } from "./server/routers"
import App from "./client/App"
import pkg from "../package.json"

export function register() {
  return {
    name: pkg.name,
    description: "Aurora Extension A",
    version: pkg.version,
    label: "Aurora Extension A",
    router: appRouter,
    ui: App,
  }
}
