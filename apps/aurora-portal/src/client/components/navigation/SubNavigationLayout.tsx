import { Link } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"

export function SubNavigationLayout({
  options,
  params,
}: {
  options?: Array<{ to: string; label: string }>
  params?: Record<string, unknown>
}) {
  const { t } = useLingui()

  const defaultOptions = [
    {
      to: "/",
      label: t`Welcome`,
    },
    {
      to: "/about",
      label: t`About`,
    },
  ]

  const navigationOptions = options || defaultOptions

  return (
    <div className="flex items-center px-3 bg-gray-50 shadow-sm w-full relative">
      {navigationOptions.map((option) => {
        return (
          <Link
            to={option.to}
            params={params}
            key={option.to}
            activeProps={{ className: `active` }}
            className="relative px-3 py-2 transition-colors"
          >
            {({ isActive }) => {
              return (
                <>
                  {/* Inner container for hover effect */}
                  <div className="px-3 py-2 rounded-md hover:bg-theme-background-lvl-1">
                    <span
                      className={`text-base ${isActive ? "font-semibold text-theme-accent" : "text-theme-default"}`}
                    >
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
