// Default configuration matching cz-conventional-changelog actual prompts
module.exports = {
  types: [
    {
      value: "feat",
      name: "feat:     A new feature",
    },
    {
      value: "fix",
      name: "fix:      A bug fix",
    },
    {
      value: "docs",
      name: "docs:     Documentation only changes",
    },
    {
      value: "style",
      name: "style:    Changes that do not affect the meaning of the code\n            (white-space, formatting, missing semi-colons, etc)",
    },
    {
      value: "refactor",
      name: "refactor: A code change that neither fixes a bug nor adds a feature",
    },
    {
      value: "perf",
      name: "perf:     A code change that improves performance",
    },
    {
      value: "test",
      name: "test:     Adding missing tests or correcting existing tests",
    },
    {
      value: "build",
      name: "build:    Changes that affect the build system or external dependencies\n            (example scopes: gulp, broccoli, npm)",
    },
    {
      value: "ci",
      name: "ci:       Changes to our CI configuration files and scripts\n            (example scopes: Travis, Circle, BrowserStack, SauceLabs)",
    },
    {
      value: "chore",
      name: "chore:    Other changes that don't modify src or test files",
    },
    {
      value: "revert",
      name: "revert:   Reverts a previous commit",
    },
  ],

  scopes: [
    { name: "build" },
    { name: "config" },
    { name: "ci" },
    { name: "core" },
    { name: "dashboard" },
    { name: "app-gardener" },
    { name: "app-template" },
    { name: "aurora-portal" },
    { name: "portal" },
    { name: "aurora-sdk" },
    { name: "signal-openstack" },
    { name: "polaris" },
    { name: "bff" },
    { name: "docs" },
    { name: "deps" },
    { name: "infra" },
    { name: "npm" },
    { name: "template" },
    { name: "ui" },
    { name: "version" },
    { name: "identity" },
  ],

  allowTicketNumber: false,
  isTicketNumberRequired: false,
  ticketNumberPrefix: "TICKET-",
  ticketNumberRegExp: "\\d{1,5}",

  // override the messages, defaults are as follows
  messages: {
    type: "Select the type of change that you're committing:",
    scope: "Denote the SCOPE of this change:",
    // used if allowCustomScopes is true
    customScope: "Denote the SCOPE of this change:",
    subject: "Write a SHORT, IMPERATIVE tense description of the change:\n",
    body: 'Provide a LONGER description of the change (optional). Use "|" to break new line:\n',
    breaking: "List any BREAKING CHANGES (optional):\n",
    footer: "List any ISSUES CLOSED by this change (optional). E.g.: #31, #34:\n",
    confirmCommit: "Are you sure you want to proceed with the commit above?",
  },

  allowCustomScopes: false,
  allowBreakingChanges: ["feat", "fix"],
  // skip any questions you want
  skipQuestions: [],

  // Match the actual character limit (94 chars as shown in your example)
  subjectLimit: 100,
  breaklineChar: "|",
  footerPrefix: "ISSUES CLOSED:",
}
