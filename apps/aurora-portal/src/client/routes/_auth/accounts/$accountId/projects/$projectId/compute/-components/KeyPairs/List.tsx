// KeyPairs.tsx - Main component for key pairs
import { KeyPairListView } from "./-components/KeyPairListView"
import { Keypair } from "@/server/Compute/types/keypair"
import { TrpcClient } from "@/client/trpcClient"

import { Suspense, use } from "react"
import { Trans } from "@lingui/react/macro"
import { Spinner, Stack } from "@cloudoperators/juno-ui-components/index"

interface KeyPairsContainerProps {
  getKeyPairsPromise: Promise<Keypair[] | undefined>
}
const KeyPairsContainer = ({ getKeyPairsPromise }: KeyPairsContainerProps) => {
  const keyPairs = use(getKeyPairsPromise)
  if (!keyPairs || keyPairs.length === 0) {
    return (
      <p>
        <Trans>No key pairs available.</Trans>
      </p>
    )
  }

  return <KeyPairListView keyPairs={keyPairs} />
}

interface KeyPairsProps {
  client: TrpcClient
  project: string
}

export function KeyPairs({ client, project }: KeyPairsProps) {
  const getKeyPairsPromise = client.compute.getKeypairsByProjectId.query({ projectId: project })

  return (
    <Suspense
      fallback={
        <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
          <Spinner variant="primary" size="large" className="m-2" />
          <Trans>Loading Key Pairs...</Trans>
        </Stack>
      }
    >
      <KeyPairsContainer getKeyPairsPromise={getKeyPairsPromise} />
    </Suspense>
  )
}
