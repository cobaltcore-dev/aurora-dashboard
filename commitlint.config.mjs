// import config from "./.github/commit-config.js"

export const types = [
  "feat", // new feature
  "fix", // bug fix
  "docs", // documentation
  "style", // formatting, missing semicolons, etc
  "refactor", // code change that neither fixes a bug nor adds a feature
  "test", // adding missing tests
  "chore", // maintain
  "perf", // performance improvements
  "ci", // continuous integration
  "build", // build system or external dependencies
  "revert", // revert previous commit
]
export const scopes = [
  "build",
  "config",
  "ci",
  "core",
  "dashboard",
  "app-gardener",
  "app-template",
  "aurora-portal",
  "portal",
  "aurora-sdk",
  "signal-openstack",
  "polaris",
  "bff",
  "docs",
  "deps",
  "infra",
  "npm",
  "template",
  "ui",
  "version",
  "identity",
  /^ISSUE-\d+$/, // Regex pattern for ISSUE-<number>]
]

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", types], // Enforces the type to be one of the specified values
    "scope-enum": [2, "always", scopes],
    "scope-case": [2, "always", "kebab-case"], // Enforces kebab-case
    "subject-case": [
      2,
      "never",
      ["start-case", "pascal-case", "upper-case"], // Disallows certain cases for the subject
    ],
  },
}
