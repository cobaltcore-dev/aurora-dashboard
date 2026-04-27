import Logo from "../../assets/logo.svg?react"
import { NavigationItem } from "./types"
import { isMatch, Link, MakeRouteMatchUnion, useRouterState } from "@tanstack/react-router"
import { UserMenu } from "./UserMenu"
import { PageHeader, ThemeToggle } from "@cloudoperators/juno-ui-components/index"
import { cn } from "@/client/utils/cn"

interface NavigationProps {
  items: NavigationItem[]
  handleThemeToggle?: (theme: string) => void
}

const textColorClass = "text-theme-pageheader-appname-default"
const textHoverClass = "hover:text-theme-pageheader-appname-hover"
const textMutedClass = "text-theme-pageheader-appname-default/40"

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
  const domain = getDomain(matches)
  return {
    name: projectMatch.loaderData?.crumbProject?.name || undefined,
    path: domain ? `${domain.path}/${projectMatch.loaderData?.crumbProject?.id}` : undefined,
  }
}

export function MainNavigation({ items, handleThemeToggle }: NavigationProps) {
  const matches = useRouterState({ select: (s) => s.matches })
  const domain = getDomain(matches)
  const project = getProject(matches)

  return (
    <PageHeader
      logo={<Logo className={cn("h-6 w-6 shrink-0 fill-current", textColorClass)} title="Aurora" />}
      applicationName={
        <div className="flex flex-nowrap items-center space-x-2">
          <Link to="/" className={cn("shrink-0", textColorClass, textHoverClass)}>
            SAP Cloud Infrastructure
          </Link>
          {domain && (
            <>
              <span className={cn("shrink-0", textMutedClass)}>|</span>
              <span data-testid="domain-name" className={cn("shrink-0", textColorClass)}>
                {domain.name}
              </span>
            </>
          )}
          {project && (
            <>
              <span className={cn("shrink-0", textMutedClass)}>|</span>
              <Link
                to={project.path + ""}
                data-testid="project-link"
                className={cn("shrink-0", textColorClass, textHoverClass)}
              >
                {project.name}
              </Link>
            </>
          )}
        </div>
      }
    >
      {items.map(({ route, label }, index) => (
        <Link className={cn("shrink-0", textColorClass, textHoverClass)} key={index} to={route}>
          {label}
        </Link>
      ))}
      <ThemeToggle onToggleTheme={(newTheme: string) => handleThemeToggle?.(newTheme)} />
      <UserMenu />
    </PageHeader>
  )
}
