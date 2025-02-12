import path from "path"

// Root-Verzeichnis und andere Konstanten
const ROOT = path.resolve(__dirname, "../../")
export const manifestPath = path.join(ROOT, "aurora.config.json")
export const extensionsTmpDir = path.join(ROOT, "tmp")
export const extensionsDir = path.join(ROOT, "node_modules")
export const clientImportsFile = path.join(ROOT, "src/client/generated", "extensions.ts")
export const serverImportsFile = path.join(ROOT, "src/server/generated", "extensions.ts")
