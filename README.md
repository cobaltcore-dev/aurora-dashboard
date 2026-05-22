[![REUSE status](https://api.reuse.software/badge/github.com/cobaltcore-dev/aurora-dashboard)](https://api.reuse.software/info/github.com/cobaltcore-dev/aurora-dashboard)

# Aurora Dashboard

A single, powerful, and easy-to-use web dashboard for managing OpenStack-based cloud infrastructure — giving operators and developers one UI for compute, storage, networking, identity, and more across projects and regions.

## Architecture

Aurora is a **pnpm monorepo** orchestrated with [Turborepo](https://turbo.build/). It contains one application and several shared packages:

```
aurora-dashboard/
├── apps/
│   └── aurora-portal/        # The main web application
└── packages/
    ├── signal-openstack/     # OpenStack API client
    ├── policy-engine/        # OpenStack policy (oslo.policy) evaluator
    └── config/               # Shared TypeScript and ESLint configuration
```

### `apps/aurora-portal`

The portal is a full-stack application with:

- **Frontend**: React + Vite, served as a SPA
- **Backend**: [Fastify](https://fastify.dev/) server with [tRPC](https://trpc.io/) for type-safe API routes
- **Auth**: OpenStack Keystone session-based authentication

The server acts as a Backend-for-Frontend (BFF), proxying and aggregating OpenStack API calls on behalf of the authenticated user.

### `packages/signal-openstack`

A typed OpenStack HTTP client built on [undici](https://github.com/nodejs/undici). Handles authentication tokens, service catalog resolution, session management, and error normalization across OpenStack services (Compute, Network, Storage, Identity, etc.).

### `packages/policy-engine`

An in-browser and server-side evaluator for OpenStack's `oslo.policy` rule format. Parses policy files and evaluates rules against a request context — enabling fine-grained, OpenStack-native authorization in the UI without additional API roundtrips.

### `packages/config`

Shared TypeScript compiler and ESLint configurations used across all apps and packages.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 9
- Access to an OpenStack environment (Keystone endpoint required — no mock mode available)

### Install dependencies

```bash
pnpm install
```

### Configure environment

```bash
cp apps/aurora-portal/.env.example apps/aurora-portal/.env
```

Edit `.env` and set at minimum:

```env
IDENTITY_ENDPOINT="https://<your-keystone-host>/identity/v3/"
```

For a local OpenStack setup, [DevStack](https://docs.openstack.org/devstack/latest/) works. For team access, ask in the project's GitHub Discussions or issues.

### Run in development

```bash
pnpm dev
```

The portal starts at `http://localhost:4005` by default.

### Build

```bash
pnpm build
```

### Run tests

```bash
pnpm test
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
