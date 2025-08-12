module.exports = {
  branches: ["main"],
  repositoryUrl: "https://github.com/cobaltcore-dev/aurora-dashboard",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          {
            type: "feat",
            release: "minor",
          },
          {
            type: "fix",
            release: "patch",
          },
          {
            type: "perf",
            release: "patch",
          },
          {
            type: "refactor",
            release: "patch",
          },
          {
            type: "build",
            scope: "deps",
            release: "patch",
          },
          {
            type: "chore",
            scope: "deps",
            release: "patch",
          },
          {
            breaking: true,
            release: "major",
          },
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
              type: "refactor",
              section: "♻️ Code Refactoring",
            },
            {
              type: "build",
              section: "🏗️ Build System",
              hidden: false,
            },
            {
              type: "chore",
              section: "🔧 Maintenance",
              hidden: false,
            },
            {
              type: "test",
              section: "✅ Tests",
              hidden: false,
            },
            {
              type: "docs",
              section: "📚 Documentation",
              hidden: false,
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
