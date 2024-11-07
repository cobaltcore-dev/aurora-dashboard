module.exports = {
  presets: [
    require("@cloudoperators/juno-ui-components/build/lib/tailwind.config"), // important, do not change
  ],
  prefix: "", // important, do not change
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  corePlugins: {
    preflight: false, // important, do not change
  },
  theme: {},
  plugins: [],
}
