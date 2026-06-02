# Aurora PR Preview Workflow

This document describes the automated PR preview workflow for the Aurora Dashboard.

## Overview

The Aurora PR Preview workflow automatically builds Docker images for pull requests and manages their deployment via ArgoCD label-based triggers. This enables developers to preview and test changes in an isolated environment before merging to main.

## How It Works

### Labels

The workflow uses two GitHub labels to control the build and deployment process:

- **`pr-build`**: Triggers Docker image build for PR preview. Add this label to build and push a preview image to GHCR.
- **`pr-preview`**: Indicates PR preview image is ready. Auto-added after successful build. Signals ArgoCD to deploy preview environment.

### Workflow Triggers

The workflow runs on the following PR events:

- `labeled` - When a label is added to the PR
- `synchronize` - When new commits are pushed to the PR
- `opened` - When a PR is opened
- `reopened` - When a PR is reopened
- `closed` - When a PR is closed

## Workflow Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PR Preview Workflow                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                                 PR Event
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                 labeled      synchronize       closed
                    │               │               │
                    └───────┬───────┘               │
                            │                       │
                            ▼                       ▼
                   ┌─────────────────┐    ┌─────────────────┐
                   │  Has pr-build   │    │   Cleanup Job   │
                   │     label?      │    │                 │
                   └────────┬────────┘    │ • Delete images │
                            │             │ • Remove labels │
                     ┌──────┴──────┐      └─────────────────┘
                     │             │
                    Yes           No
                     │             │
                     │             └─> Exit
                     │
                     ▼
          ┌──────────────────────┐
          │  New commit pushed?  │
          │  Has pr-preview?     │
          └──────────┬───────────┘
                     │
              ┌──────┴──────┐
             Yes            No
              │              │
              ▼              │
    ┌─────────────────┐     │
    │ Remove pr-preview│     │
    │      label       │     │
    └─────────┬───────┘     │
              │              │
              └──────┬───────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   Checkout PR code   │
          │   at commit SHA      │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Generate version    │
          │  pr-{NUM}-{SHA}      │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Build Docker image  │
          │  Push to GHCR        │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Add pr-preview      │
          │      label           │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Cleanup old images  │
          │  (pr-{NUM}-*)        │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  ArgoCD detects      │
          │  pr-preview label    │
          │  → Deploys preview   │
          └──────────────────────┘
```

### 1. PR Events

- Workflow triggers on PR label changes, new commits, or PR closure
- Concurrency control ensures only one workflow runs per PR at a time

### 2. Build Phase

Runs when PR is NOT closed and has the `pr-build` label:

1. **Check for `pr-build` label** - Skip if not present
2. **Remove `pr-preview` label on new commits** - If a new commit is pushed (synchronize event) and the `pr-preview` label exists, it is removed to force ArgoCD to redeploy
3. **Checkout PR code** - Checks out the exact commit SHA from the PR
4. **Generate version tag** - Creates a tag in the format `pr-{PR_NUMBER}-{SHORT_SHA}` (e.g., `pr-123-a1b2c3d`)
5. **Build and push Docker image** - Builds the Docker image using `docker/Dockerfile.public` and pushes it to `ghcr.io/{org}/aurora-pr-preview:{version}`
6. **Add `pr-preview` label** - Adds the label to trigger ArgoCD deployment

### 3. Cleanup Old Images

Runs after a successful build:

- Deletes previous images for this PR number (matching pattern `pr-{NUMBER}-*`)
- Keeps only the newly built image (excludes current version tag)
- Prevents accumulation of stale images from multiple commits

### 4. PR Closure Cleanup

Runs when a PR is closed:

1. Delete all images for this PR (matching pattern `pr-{NUMBER}-*`)
2. Remove `pr-preview` label from the closed PR
3. (Optional) Send Slack notification if cleanup fails

## Usage

### To Deploy a PR Preview

1. Open a pull request or navigate to an existing one
2. Add the `pr-build` label to the PR
3. Wait for the workflow to complete (builds Docker image)
4. The `pr-preview` label will be added automatically
5. ArgoCD will detect the label and deploy the preview environment

### To Update a PR Preview

1. Push new commits to the PR branch
2. The workflow automatically:
   - Removes the `pr-preview` label
   - Rebuilds the Docker image with a new tag
   - Re-adds the `pr-preview` label
   - ArgoCD redeploys with the new image

### To Remove a PR Preview

1. Close or merge the PR
2. The workflow automatically:
   - Deletes all Docker images for that PR
   - Removes the `pr-preview` label
   - ArgoCD will clean up the preview environment

## Docker Image Details

### Registry

Images are pushed to GitHub Container Registry (GHCR):

```
ghcr.io/{org}/aurora-pr-preview
```

### Image Tags

Format: `pr-{PR_NUMBER}-{SHORT_SHA}`

Example: `pr-123-a1b2c3d` (PR #123, commit SHA starts with `a1b2c3d`)

### Dockerfile Location

```
docker/Dockerfile
```

## Security

### Forked Repositories

The workflow includes a safety check that prevents builds from forked repositories:

```yaml
github.event.pull_request.head.repo.full_name == github.repository
```

This prevents unauthorized users from triggering builds and consuming resources.

### Permissions

The workflow requires the following permissions:

- `contents: read` - Read repository contents
- `packages: write` - Push to GitHub Container Registry
- `issues: write` - Manage labels
- `pull-requests: write` - Manage PR labels

### Label Permissions

Only users with **Triage** role or higher can add labels to PRs, which controls who can trigger builds.

## Troubleshooting

### Build Doesn't Start

- Ensure the `pr-build` label is present on the PR
- Check that the PR is not from a forked repository
- Verify the workflow file exists and is valid

### Image Not Found

- Check the GitHub Actions logs for build errors
- Verify the image was pushed to GHCR: `ghcr.io/{org}/aurora-pr-preview:pr-{NUMBER}-{SHA}`
- Ensure `GITHUB_TOKEN` has `packages: write` permission

### ArgoCD Doesn't Deploy

- Verify the `pr-preview` label is present on the PR
- Check ArgoCD configuration for label-based deployment rules
- Confirm ArgoCD has access to GHCR

### Old Images Not Cleaned Up

- Check the cleanup job logs in GitHub Actions
- Verify the workflow has `packages: write` permission
- Manually clean up images if needed via GHCR web interface

## Configuration

### Environment Variables

Defined in the workflow file:

```yaml
REGISTRY: ghcr.io
DOCKER_PATH: "docker/Dockerfile"
PR_BUILD_LABEL: "pr-build"
PR_PREVIEW_LABEL: "pr-preview"
```

### Concurrency

```yaml
concurrency:
  group: aurora-pr-preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

This ensures only one workflow runs per PR at a time, canceling any in-progress runs when a new one starts.

## Related Documentation

- [Aurora Architecture Overview](./aurora_architecture_overview.md)
- [Semantic Release](./semantic_release.md)
