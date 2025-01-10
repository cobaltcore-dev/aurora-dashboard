// import config from "./.github/commit-config.js"

export const types = [
  "build",
  "chore",
  "fix",
  "feat",
  "merge",
  "publish",
  "release",
  "refactor",
  "research",
  "style",
  "test",
]
export const scopes = [
  "build",
  "config",
  "ci",
  "core",
  "starlight",
  "dashboard",
  "aurora-portal",
  "polaris",
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
