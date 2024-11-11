import config from "./.github/commit-config.js"

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", config.types], // Enforces the type to be one of the specified values
    "scope-enum": [2, "always", config.scopes],
    "scope-case": [2, "always", "kebab-case"], // Enforces kebab-case
    "subject-case": [
      2,
      "never",
      ["start-case", "pascal-case", "upper-case"], // Disallows certain cases for the subject
    ],
  },
}
