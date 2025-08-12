module.exports = {
  branches: ["main", "mark-semantic-release-setup"],
  repositoryUrl: "https://github.com/cobaltcore-dev/aurora-dashboard",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        // Release rules based on the conventional commit types and follow semantic versioning principles
        releaseRules: [
          // Major version bumps (breaking changes)
          { type: "feat", breaking: true, release: "major" },
          { type: "fix", breaking: true, release: "major" },
          { type: "perf", breaking: true, release: "major" },
          { type: "refactor", breaking: true, release: "major" },
          { type: "build", breaking: true, release: "major" },
          { type: "chore", breaking: true, release: "major" },
          { type: "ci", breaking: true, release: "major" },
          { type: "docs", breaking: true, release: "major" },
          { type: "style", breaking: true, release: "major" },
          { type: "test", breaking: true, release: "major" },
          { type: "revert", breaking: true, release: "major" },

          // Minor version bumps (new features)
          { type: "feat", breaking: false, release: "minor" },

          // Patch version bumps (bug fixes and other changes)
          { type: "fix", breaking: false, release: "patch" },
          { type: "perf", breaking: false, release: "patch" },
          { type: "revert", breaking: false, release: "patch" },

          // No release (maintenance and documentation)
          { type: "build", breaking: false, release: false },
          { type: "chore", breaking: false, release: false },
          { type: "ci", breaking: false, release: false },
          { type: "docs", breaking: false, release: false },
          { type: "refactor", breaking: false, release: false },
          { type: "style", breaking: false, release: false },
          { type: "test", breaking: false, release: false },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            {
              type: "feat",
              section: "✨ Features",
            },
            {
              type: "fix",
              section: "🐛 Bug Fixes",
            },
            {
              type: "perf",
              section: "⚡ Performance Improvements",
            },
            {
              type: "revert",
              section: "⏪ Reverts",
            },
            {
              type: "docs",
              section: "📚 Documentation",
            },
            {
              type: "style",
              section: "💄 Styles",
            },
            {
              type: "refactor",
              section: "♻️ Code Refactoring",
            },
            {
              type: "test",
              section: "✅ Tests",
            },
            {
              type: "build",
              section: "🔧 Build System",
            },
            {
              type: "ci",
              section: "👷 Continuous Integration",
            },
            {
              type: "chore",
              section: "🔨 Chores",
              hidden: true, // Optional: hide chore commits from changelog
            },
          ],
        },
      },
    ],
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
      },
    ],
    [
      "@semantic-release/github",
      {
        successComment: false,
        failTitle: false,
        failComment: false,
        releasedLabels: ["released"],
      },
    ],
  ],
}
