import { useLocation } from "wouter"
// @ts-expect-error missing types
import { Button, Icon } from "@cloudoperators/juno-ui-components"
import { trpc } from "../../../trpcClient"

export function Nav() {
  const checkLoginStatus = trpc.identity.getAuthStatus.useQuery()
  const logoutMutation = trpc.identity.logout.useMutation()
  const setLocation = useLocation()[1]

  const login = () => {
    setLocation("/auth/signin")
  }

  const logout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => checkLoginStatus.refetch() })
  }

  return (
    <div className="mt-5 pt-5 w-24 flex justify-center items-center">
      {checkLoginStatus.data?.isAuthenticated ? (
        <div className="flex flex-col items-center">
          <Icon color="jn-global-text" icon="accountCircle" />
          <div className="mt-1 mb-3">{checkLoginStatus.data?.user?.name}</div>
          <Button disabled={logoutMutation.isPending} variant="default" size="small" onClick={logout}>
            Sign Out
          </Button>
        </div>
      ) : (
        <Button variant="primary" size="small" onClick={login} className="mr-2 ml-2">
          Sign In
        </Button>
      )}
    </div>
  )
}
