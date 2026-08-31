// KeyPairs.tsx - Main component for key pairs
import { KeyPairListView } from "./-components/KeyPairListView"
import { Keypair } from "@/server/Compute/types/keypair"
import { TrpcClient } from "@/client/trpcClient"

import { Suspense, use } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Status } from "@cloudoperators/juno-ui-components/index"

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
  const getKeyPairsPromise = client.compute.getKeypairsByProjectId.query({ project_id: project })
  const { t } = useLingui()

  return (
    <Suspense fallback={<Status status="progress" title={t`Loading Key Pairs...`} />}>
      <KeyPairsContainer getKeyPairsPromise={getKeyPairsPromise} />
    </Suspense>
  )
}
