# Semantic Release Setup

This project uses [Semantic Release](https://semantic-release.gitbook.io/) to automate versioning, changelog generation, and GitHub releases based on conventional commit messages.

## How It Works

Semantic Release analyzes commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification to determine:

- The next version number (major, minor, or patch)
- Generate release notes and changelog
- Create Git tags and GitHub releases
- Update package.json versions

## Commit Message Convention

We use the existing commitlint configuration that enforces conventional commits:

### Commit Types

- `feat`: A new feature (triggers minor release)
- `fix`: A bug fix (triggers patch release)
- `perf`: Performance improvement (triggers patch release)
- `refactor`: Code refactoring (triggers patch release)
- `build`: Changes to build system or dependencies
- `chore`: Maintenance tasks
- `test`: Adding or updating tests
- `docs`: Documentation changes

### Breaking Changes

Any commit with `BREAKING CHANGE:` in the footer or `!` after the type triggers a major release.

### Examples

```bash
# Patch release (1.0.0 -> 1.0.1)
git commit -m "fix(aurora-portal): resolve authentication issue"

# Minor release (1.0.0 -> 1.1.0)
git commit -m "feat(gardener): add cluster creation wizard"

# Major release (1.0.0 -> 2.0.0)
git commit -m "feat(core)!: redesign authentication system

BREAKING CHANGE: The authentication API has been completely redesigned"
```

## Release Process

### Automatic Releases

Releases are triggered automatically when commits are pushed to the `main` branch.

### Manual Release

You can trigger a release manually using GitHub Actions:

1. Go to the "Actions" tab in GitHub
2. Select "Semantic Release" workflow
3. Click "Run workflow"

## Configuration Files

- `.releaserc.js`: Main semantic-release configuration
- `.github/workflows/semantic-release.yaml`: GitHub Actions workflow
- `commitlint.config.mjs`: Commit message validation (already exists)

## Release Artifacts

Each release creates:

1. **Git Tag**: Following semver (e.g., `v1.2.3`)
2. **GitHub Release**: With generated release notes
3. **Changelog**: Updated `CHANGELOG.md` file
4. **Version Bumps**: Updated `package.json` files

## Environment Variables

The following secrets must be configured in GitHub repository settings:

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `NPM_TOKEN`: Required if publishing to npm registry (currently disabled)

## Workflow Integration

Semantic Release runs after successful:

- Build (`pnpm build`)

## Dry Run

Test semantic release without creating actual releases:

```bash
pnpm release:dry
```

## Troubleshooting

### No Release Created

- Check if commits follow conventional commit format
- Ensure commits contain releasable changes (feat, fix, perf, refactor)
- Verify all CI checks pass

### Permission Issues

- Ensure GitHub token has write permissions
- Check repository settings for branch protection rules

### Version Conflicts

- Semantic release handles versioning automatically
- Don't manually edit version numbers in package.json

## Team Guidelines

1. **Always use conventional commits** - This is enforced by commitlint
2. **Use descriptive scopes** - Reference the allowed scopes in `commitlint.config.mjs`
3. **Document breaking changes** - Use `BREAKING CHANGE:` footer for major releases
4. **Keep commits atomic** - One logical change per commit
5. **Use meaningful commit messages** - They become part of the changelog

## Monitoring

- Watch the "Semantic Release" workflow in GitHub Actions
- Check the generated `CHANGELOG.md` after each release
- Monitor GitHub releases page for published releases
