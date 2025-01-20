import * as server0 from "@cobaltcore-dev/aurora-extension-a/server";

export const registerServers = () => ({
  "cobaltcore-dev_aurora-extension-a": server0.registerRouter().appRouter,
})