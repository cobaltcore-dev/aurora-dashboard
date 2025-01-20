const client0 = import("@cobaltcore-dev/aurora-extension-a/client").then((m) => m.registerClient());

export const registerClients = () => ([
  {
    extensionName: "@cobaltcore-dev/aurora-extension-a", 
    routerScope: "cobaltcore-dev_aurora-extension-a",
    label: "Mars",
    App: client0.then((m) => ({ default: m.App })),
    Logo: client0.then((m) => ({ default: m.Logo })),
  },
])