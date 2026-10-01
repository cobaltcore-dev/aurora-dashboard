import { createPermissionRouter } from "@cobaltcore-dev/aurora/server"

const KEY_MANAGER_MAPPINGS = {
  "key-manager:secrets:list": { engine: "keyManager", rule: "key-manager:secrets:list" },
  "key-manager:secrets:get": { engine: "keyManager", rule: "key-manager:secrets:get" },
  "key-manager:secrets:payload": { engine: "keyManager", rule: "key-manager:secrets:payload" },
  "key-manager:secrets:create": { engine: "keyManager", rule: "key-manager:secrets:create" },
  "key-manager:secrets:update": { engine: "keyManager", rule: "key-manager:secrets:update" },
  "key-manager:secrets:delete": { engine: "keyManager", rule: "key-manager:secrets:delete" },

  "key-manager:containers:list": { engine: "keyManager", rule: "key-manager:containers:list" },
  "key-manager:containers:get": { engine: "keyManager", rule: "key-manager:containers:get" },
  "key-manager:containers:create": { engine: "keyManager", rule: "key-manager:containers:create" },
  "key-manager:containers:update": { engine: "keyManager", rule: "key-manager:containers:update" },
  "key-manager:containers:delete": { engine: "keyManager", rule: "key-manager:containers:delete" },

  "key-manager:orders:list": { engine: "keyManager", rule: "key-manager:orders:list" },
  "key-manager:orders:get": { engine: "keyManager", rule: "key-manager:orders:get" },
  "key-manager:orders:create": { engine: "keyManager", rule: "key-manager:orders:create" },
  "key-manager:orders:delete": { engine: "keyManager", rule: "key-manager:orders:delete" },
  "key-manager:orders:update": { engine: "keyManager", rule: "key-manager:orders:update" },
} as const

export const buildKeyManagerPermissionRouter = (policyDir: string) =>
  createPermissionRouter({
    policyDir,
    engines: {
      keyManager: { fileName: "key-manager.json" },
    },
    mappings: KEY_MANAGER_MAPPINGS,
  })
