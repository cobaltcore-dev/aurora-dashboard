import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/accounts/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/accounts/"!</div>
}
