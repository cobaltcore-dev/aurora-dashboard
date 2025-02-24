import { Link, useLocation } from "wouter"
import { NavigationItem } from "./types"

export function SubNavigation({ items }: { items: NavigationItem[] }) {
  const [location] = useLocation()

  return (
    <div className="flex items-center px-3 bg-gray-50 shadow-sm w-full relative">
      {items.map(({ route, label }) => (
        <Link key={route} href={route} className="relative px-3 py-2 transition-colors">
          {/* Inner container for hover effect */}
          <div className="px-3 py-2 rounded-md hover:bg-juno-grey-blue-1">
            <span className={`text-base ${location === route ? "font-semibold text-theme-accent" : "text-gray-700"}`}>
              {label}
            </span>
          </div>

          {/* Bottom border effect */}
          {location === route && <div className="absolute left-0 bottom-0 w-full h-[3px] bg-theme-accent" />}
        </Link>
      ))}
    </div>
  )
}
