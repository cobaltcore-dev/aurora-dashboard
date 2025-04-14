import { Link, linkOptions } from "@tanstack/react-router"

const defaultOptions = [
  linkOptions({
    to: "/",
    label: "Welcome",
  }),
  linkOptions({
    to: "/about",
    label: "About",
    activeOptions: { exact: true },
  }),
]

export function SubNavigationLayout({
  options = defaultOptions,
  params,
}: {
  options?: Array<{ to: string; label: string }>
  params?: Record<string, unknown>
}) {
  return (
    <div className="flex items-center px-3 bg-gray-50 shadow-sm w-full relative">
      {options.map((option) => {
        return (
          <Link
            {...option}
            params={params}
            key={option.to}
            activeProps={{ className: `active` }}
            className="relative px-3 py-2 transition-colors"
          >
            {({ isActive }) => {
              return (
                <>
                  {/* Inner container for hover effect */}
                  <div className="px-3 py-2 rounded-md hover:bg-juno-grey-blue-1">
                    <span className={`text-base ${isActive ? "font-semibold text-theme-accent" : "text-gray-700"}`}>
                      {option.label}
                    </span>
                  </div>

                  {/* Bottom border effect */}
                  {isActive && <div className="absolute left-0 bottom-0 w-full h-[3px] bg-theme-accent" />}
                </>
              )
            }}
          </Link>
        )
      })}
    </div>
  )
}
