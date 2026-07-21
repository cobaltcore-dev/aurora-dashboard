#!/bin/sh
# Development server startup script.
#
# Why this script exists instead of a plain `tsx watch ...` in package.json:
# Turbo mangles multi-flag commands when passing them through its task runner.
# A shell script avoids that by keeping argument parsing in the shell.
#
# --include: watches server-side source in workspace packages so the server
# restarts automatically when any server package source is edited. Client files
# are intentionally excluded - they are watched by Vite, not tsx. Watching
# client files here would restart the Fastify+Vite server on every client edit,
# dropping the HMR websocket connection.
#
# --exclude **/dist/**: prevents build output from triggering unnecessary restarts.
# --exclude **/*.test.ts: prevents test files from triggering restarts.
#
# --watch-kill-signal=SIGKILL: kills the old process immediately on restart
# instead of waiting for graceful shutdown, which avoids "address already in use" errors.

exec node_modules/.bin/tsx watch \
  --env-file=.env \
  --tsconfig tsconfig.server.json \
  --watch-kill-signal=SIGKILL \
  --include ../../packages/aurora/src/server \
  --include ../../packages/aurora/src/types \
  --include ../../packages/policy-engine/src \
  --include ../../packages/signal-openstack/src \
  --exclude '**/*.test.ts' \
  --exclude '**/dist/**' \
  src/server/server.ts
