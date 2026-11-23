import { projectScopedProcedure } from "../../trpc"
import { withErrorHandling } from "../../helpers/errorHandling"
import { kubernetesInputSchema } from "../types/common"
import { configMapSchema } from "../types/gardenerInfo"
import { publicConfigMapPath, gardenerRequest } from "../helpers/gardenerClient"

const GETTING_STARTED_CONFIGMAP_NAME = "scikube-getting-started-markdown"

export const gettingStartedRouter = {
  getGettingStarted: projectScopedProcedure.input(kubernetesInputSchema).query(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      const response = await gardenerRequest(ctx, input.landscape, {
        method: "GET",
        path: publicConfigMapPath(GETTING_STARTED_CONFIGMAP_NAME),
        schema: configMapSchema,
        operation: "get getting started",
        allowNotFound: true,
      })

      // If the ConfigMap is not found, return null markdown
      if (!response) {
        return { markdown: null }
      }

      // Return the README.md key, or null if it's missing
      return {
        markdown: response.data?.["README.md"] ?? null,
      }
    }, "get getting started")
  ),
}
