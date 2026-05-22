# Contributing

## Code of Conduct

All members of the project community must abide by the [SAP Open Source Code of Conduct](https://github.com/SAP/.github/blob/main/CODE_OF_CONDUCT.md). Instances of abusive or unacceptable behavior may be reported by contacting [a project maintainer](.reuse/dep5).

## How to Contribute

1. **Open an issue** describing the bug or feature before starting work.
2. The team reviews and assigns the issue if approved.
3. **Claim the issue** by commenting — avoids duplicate effort.
4. Fork, branch, implement, and open a pull request.

Contributions must be licensed under [Apache 2.0](./LICENSE). A Developer Certificate of Origin (DCO) sign-off is required and handled automatically on your first PR.

## Development Setup

### Prerequisites

- Node.js >= 24
- pnpm >= 9
- Access to an OpenStack environment (Keystone endpoint required)

### Install

```bash
pnpm install
```

### Configure

```bash
cp apps/aurora-portal/.env.example apps/aurora-portal/.env
```

Set `IDENTITY_ENDPOINT` to your Keystone v3 URL. See the [README](README.md) for details.

### Run

```bash
pnpm dev        # start dev server
pnpm test       # run all tests
pnpm typecheck  # type checking
pnpm lint       # lint
pnpm build      # production build
```

## Commit Messages

This project enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint. Use:

```bash
pnpm commit     # interactive commit helper (commitizen)
```

Or write manually following this format:

```
<type>(<scope>): <subject>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature (triggers minor release) |
| `fix` | Bug fix (triggers patch release) |
| `perf` | Performance improvement (triggers patch release) |
| `refactor` | Code change, no bug fix or feature |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `build` | Build system or dependency changes |
| `ci` | CI configuration changes |
| `chore` | Maintenance tasks |
| `revert` | Revert a previous commit |

### Scopes

Use one of the allowed scopes: `aurora-portal`, `signal-openstack`, `ui`, `bff`, `core`, `portal`, `network`, `identity`, `gardener`, `config`, `ci`, `build`, `docs`, `deps`, `infra`, `playwright`, and others defined in `commitlint.config.mjs`.

### Breaking Changes

Append `!` to the type or add a `BREAKING CHANGE:` footer to trigger a major release:

```bash
git commit -m "feat(core)!: redesign auth flow

BREAKING CHANGE: session cookie format has changed"
```

## Pull Requests

- PRs require passing CI (build, lint, typecheck, tests).
- PR titles must follow the same conventional commit format — enforced by CI.
- Keep commits atomic and focused.

## Issues and Planning

Use [GitHub Issues](https://github.com/cobaltcore-dev/aurora-dashboard/issues) for bugs and feature requests. Provide enough context to reproduce the issue.
