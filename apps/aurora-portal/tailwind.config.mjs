import junoConfig from "@cloudoperators/juno-ui-components/build/lib/tailwind.config"
import defaultColors from "tailwindcss/colors"

// Create prefixed default colors with 'tw-' prefix
const prefixedDefaultColors = Object.fromEntries(
  Object.entries(defaultColors).map(([colorName, colorValue]) => {
    // If the color is an object (like with shades 100, 200, etc.)
    if (typeof colorValue === "object") {
      return [`aurora-${colorName}`, colorValue]
    }
    // If it's a direct color value
    return [`aurora-${colorName}`, colorValue]
  })
)

export default {
  presets: [
    junoConfig, // important, do not change
  ],
  prefix: "", // important, do not change
  content: ["./src/**/*.{ts,tsx}", "./public/index.html"],
  corePlugins: {
    preflight: false, // important, do not change
  },
  theme: {
    // Extend the theme to add the prefixed default Tailwind colors
    // while keeping the Juno UI colors as they are
    extend: {
      colors: prefixedDefaultColors,
    },
  },
  plugins: [],
}
