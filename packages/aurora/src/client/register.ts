import { createAuroraRouter } from "./router"

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAuroraRouter>
  }
}
