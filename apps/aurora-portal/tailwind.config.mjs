import junoConfig from "@cloudoperators/juno-ui-components/tailwind.config.js"
export default {
  presets: [
    junoConfig, // important, do not change
  ],
  prefix: "", // important, do not change
  content: ["./src/**/*.{ts,tsx}", "./public/index.html"],
  corePlugins: {
    preflight: false, // important, do not change
  },
  theme: {},
  plugins: [],
}
