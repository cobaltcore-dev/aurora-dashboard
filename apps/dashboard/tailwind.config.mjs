import junoConfig from "@cloudoperators/juno-ui-components/build/lib/tailwind.config"
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
