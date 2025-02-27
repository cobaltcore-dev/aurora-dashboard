import { projectRouter } from "./projectRouter"
import { auroraRouter } from "../../trpc"

export const projectRouters = {
  project: auroraRouter({ ...projectRouter }),
}
