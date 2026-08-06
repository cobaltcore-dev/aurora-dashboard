# PR Preview Setup

## Security Configuration Required

This PR preview workflow runs on a self-hosted runner and has access to `GITHUB_TOKEN`. To prevent malicious code execution from fork PRs, the following repository settings **must** be configured:

### Required GitHub Repository Settings

1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Fork pull request workflows from outside collaborators**
3. Select: **"Require approval for first-time contributors"**

This ensures that:

- PRs from organization members run automatically
- PRs from external forks require manual approval before workflows execute
- Workflow changes can be tested in PRs before merging

### Why Not `pull_request_target`?

While `pull_request_target` would prevent fork-controlled workflow code execution, it's incompatible with PR previews because:

- The workflow runs from the base branch (main), not the PR branch
- Workflow changes cannot be tested in PRs
- This breaks the iterative development of the preview infrastructure itself

### Alternative: Restrict PR Creation

If you want stronger security, consider restricting who can create PRs via:

- Branch protection rules
- Repository collaborator permissions
- CODEOWNERS review requirements
