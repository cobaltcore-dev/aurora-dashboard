// commit-config.js
module.exports = {
  types: ["build", "chore", "fix", "feat", "merge", "publish", "release", "refactor", "research", "style", "test"],
  scopes: [
    "build",
    "config",
    "ci",
    "core",
    "dashboard",
    "docs",
    "deps",
    "infra",
    "npm",
    "template",
    "ui",
    "version",
    /^ISSUE-\d+$/, // Regex pattern for ISSUE-<number>]
  ],
}
