import Logo from "../../assets/logo.svg?react"
import { NavigationItem } from "./types"
import { isMatch, Link, MakeRouteMatchUnion, useRouterState } from "@tanstack/react-router"
import { UserMenu } from "./UserMenu"
import { PageHeader, ThemeToggle } from "@cloudoperators/juno-ui-components/index"
import { LanguageSelect } from "./LanguageSelect"
import { cn } from "@/client/utils/cn"

interface NavigationProps {
  items: NavigationItem[]
  handleThemeToggle?: (theme: string) => void
}

// Consistent text styling constants for white theme navigation
// Using constants ensures uniform styling across all navigation elements
const textColorClass = "text-white"
const textHoverClass = "hover:text-theme-accent"
const textMutedClass = "text-white/40"

function getDomain(matches: MakeRouteMatchUnion[]) {
  const domainMatch = matches.filter((match) => isMatch(match, "loaderData.crumbDomain"))[0]
  if (!domainMatch) {
    return null
  }
  return {
    name: domainMatch?.loaderData?.crumbDomain?.name,
    path: domainMatch?.loaderData?.crumbDomain?.path,
  }
}

function getProject(matches: MakeRouteMatchUnion[]) {
  const projectMatch = matches.filter((match) => isMatch(match, "loaderData.crumbProject"))[0]
  if (!projectMatch) {
    return null
  }
  return {
    name: projectMatch.loaderData?.crumbProject?.name || undefined,
    path: projectMatch.fullPath,
  }
}

export function MainNavigation({ items, handleThemeToggle }: NavigationProps) {
  const matches = useRouterState({ select: (s) => s.matches })
  const domain = getDomain(matches)
  const project = getProject(matches)

  return (
    <PageHeader
      logo={<Logo className={cn("h-6 w-6 flex-shrink-0 fill-current", textColorClass)} title="Aurora" />}
      applicationName={
        <div className="flex flex-nowrap items-center space-x-2">
          <Link to="/" className="flex flex-nowrap items-center space-x-2">
            <span className={cn("flex-shrink-0", textColorClass, textHoverClass)}>Aurora</span>
          </Link>
          {domain && (
            <>
              <span className={cn("flex-shrink-0", textMutedClass)}>/</span>
              <Link
                to={domain.path}
                data-testid="domain-link"
                className={cn("flex-shrink-0", textColorClass, textHoverClass)}
              >
                {domain.name}
              </Link>
            </>
          )}
          {project && (
            <>
              <span className={cn("flex-shrink-0", textMutedClass)}>/</span>
              <Link
                to={project.path + "/compute/$"}
                data-testid="project-link"
                className={cn("flex-shrink-0", textColorClass, textHoverClass)}
              >
                {project.name}
              </Link>
            </>
          )}
        </div>
      }
    >
      {items.map(({ route, label }, index) => (
        <Link className={cn("flex-shrink-0", textColorClass, textHoverClass)} key={index} to={route}>
          {label}
        </Link>
      ))}
      <LanguageSelect className={textColorClass} />
      <ThemeToggle onToggleTheme={(newTheme: string) => handleThemeToggle?.(newTheme)} />
      <UserMenu />
    </PageHeader>
  )
}
