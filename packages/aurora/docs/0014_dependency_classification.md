# Dependency Classification: `dependencies` vs. `peerDependencies`

## Rule

A package belongs in `peerDependencies` if **any of the following are true**:

1. It provides a React context that consumers access via a hook (`useContext`, `useState`, etc.)
2. It maintains singleton state that breaks when two copies exist in the same app
3. It is a framework the consumer is already required to provide (`react`, `fastify`, etc.)

Everything else (pure utilities, server-only packages, packages with no runtime state) belongs in `dependencies`.

## Why it matters

If a package is in `dependencies`, npm/pnpm installs it inside `node_modules/@cobaltcore-dev/aurora/node_modules/`. Any consumer of this package also has their own copy in their root `node_modules/`. The bundler can end up resolving two separate instances of the same package.

For pure utilities (e.g. `zod`, `clsx`) this is harmless. For packages that hold React context or module-level singletons, a duplicate instance means:

- React hooks throw "Invalid hook call" (two Reacts, hooks belong to one of them)
- Context providers and consumers are disconnected (e.g. a Provider from one copy, its hook from another)
- Any shared state router history, query client or form state becomes inaccessible

Listing these as `peerDependencies` tells the package manager and the consumer: "do not install your own copy; use whatever the host app provides."

## How to classify a new package

Ask these questions in order:

1. **Does it render React components or use React hooks?** If yes, peer.
2. **Does it export a Provider that wraps the app?** If yes, peer.
3. **Does it maintain module-level state that would break with two instances?** (e.g. a global event emitter, a store, a router history) If yes, peer.
4. **Is it server-only (Node.js, runs in Fastify, never imported by client code)?** If yes, dependency.
5. **Is it a pure function/utility with no side effects?** If yes, dependency.

## How to detect React context usage in a package

```sh
# Does the package export a Provider or use createContext?
grep -r "createContext\|Provider" node_modules/<package>/dist --include="*.js" -l

# Does it call useContext, useState, useEffect etc.?
grep -r "useContext\|useState\|useEffect\|useRef" node_modules/<package>/dist --include="*.js" -l
```

If either grep returns files, the package almost certainly needs to be a peer dependency.
