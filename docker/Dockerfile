FROM node:24-alpine
LABEL source_repository="https://github.com/cobaltcore-dev/aurora-dashboard"

RUN apk upgrade --no-cache --no-progress && apk add --no-cache ca-certificates curl

WORKDIR /app
COPY . .

RUN corepack enable && corepack prepare
RUN CI=true pnpm install && pnpm build

WORKDIR /app/apps/dashboard

# Create default .env from example (can be overridden at runtime with -e flags)
RUN cp .env.example .env

CMD ["pnpm","preview"]