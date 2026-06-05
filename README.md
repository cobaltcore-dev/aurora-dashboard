[![REUSE status](https://api.reuse.software/badge/github.com/cobaltcore-dev/aurora-dashboard)](https://api.reuse.software/info/github.com/cobaltcore-dev/aurora-dashboard)

# Aurora Dashboard test

A single, powerful, and easy-to-use web dashboard for managing OpenStack-based cloud infrastructure — giving operators and developers one UI for compute, storage, networking, identity, and more across projects and regions.

## Architecture

Aurora is a **pnpm monorepo** orchestrated with [Turborepo](https://turbo.build/). It contains one reference application and several packages:

```
aurora-dashboard/
├── apps/
│   └── dashboard/            # Reference consumer app (uses @cobaltcore-dev/aurora)
└── packages/
    ├── aurora/               # Published npm library — server + client
    ├── signal-openstack/     # OpenStack API client
    ├── policy-engine/        # OpenStack policy (oslo.policy) evaluator
    └── config/               # Shared TypeScript and ESLint configuration
```

### `packages/aurora`

The core publishable library (`@cobaltcore-dev/aurora`) with two entry points:

- **`@cobaltcore-dev/aurora/server`** — `createServer(config)` starts a Fastify BFF that proxies OpenStack API calls and exposes them via tRPC
- **`@cobaltcore-dev/aurora/client`** — `<AuroraApp />` is a self-contained React component that renders the full dashboard UI

See [`packages/aurora/README.md`](packages/aurora/README.md) for the full consumer guide.

### `apps/dashboard`

A minimal reference implementation showing how to consume `@cobaltcore-dev/aurora`. It owns nothing except:

- Reading environment variables and passing them to `createServer()`
- Persisting theme preference via `localStorage`
- A Vite config wired up for production builds

### `packages/signal-openstack`

A typed OpenStack HTTP client built on [undici](https://github.com/nodejs/undici). Handles authentication tokens, service catalog resolution, session management, and error normalization across OpenStack services.

### `packages/policy-engine`

An in-browser and server-side evaluator for OpenStack's `oslo.policy` rule format. Enables fine-grained, OpenStack-native authorization in the UI without additional API roundtrips.

### `packages/config`

Shared TypeScript compiler and ESLint configurations used across all packages.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 10
- Access to an OpenStack environment (Keystone endpoint required)

### Install dependencies

```bash
pnpm install
```

### Configure environment

```bash
cp apps/dashboard/.env.example apps/dashboard/.env
```

Edit `.env` and set at minimum:

```env
IDENTITY_ENDPOINT="https://<your-keystone-host>/identity/v3/"
VITE_BFF_ENDPOINT="/polaris-bff"
```

### Run in development

```bash
pnpm dev
```

The dashboard starts at `http://localhost:4005` by default.

### Build

```bash
pnpm build
```

### Preview production build

```bash
pnpm preview
```

### Run tests

```bash
pnpm test
```

## Using aurora in your own app

Install the package and follow the guide in [`packages/aurora/README.md`](packages/aurora/README.md).

```bash
npm install @cobaltcore-dev/aurora
```

## Release Management

This project uses [Semantic Release](https://semantic-release.gitbook.io/) for automated versioning and changelog generation based on conventional commits.

See [docs/semantic_release.md](docs/semantic_release.md) for full details.

## Support, Feedback, Contributing

Feature requests, bug reports, and contributions are welcome via [GitHub issues](https://github.com/cobaltcore-dev/aurora-dashboard/issues). See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Security / Disclosure

If you find a security bug, follow our [security policy](https://github.com/cobaltcore-dev/aurora-dashboard/security/policy). Do not open GitHub issues for security problems.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](https://github.com/SAP/.github/blob/main/CODE_OF_CONDUCT.md).

## Licensing

Copyright 2026 SAP SE or an SAP affiliate company and aurora-dashboard contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/cobaltcore-dev/aurora-dashboard).
