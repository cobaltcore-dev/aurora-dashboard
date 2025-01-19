const client0 = import("./node_modules/@cobaltcore-dev/aurora-extension-a/dist/client/index.js").then((m) => m.registerClient());

export const registerClients = () => ([
  {
    extensionName: "@cobaltcore-dev/aurora-extension-a", 
    routerScope: "cobaltcore-dev_aurora-extension-a",
    App: client0.then((m) => ({ default: m.App })),
    Logo: client0.then((m) => ({ default: m.Logo })),
  },
])