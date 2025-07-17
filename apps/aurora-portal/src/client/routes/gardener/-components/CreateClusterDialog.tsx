// components/CreateClusterWizard/CreateClusterWizard.tsx

import { TrpcClient } from "@/client/trpcClient"
import { Modal, Spinner } from "@cloudoperators/juno-ui-components/index"
import { t } from "@lingui/core/macro"
import { CreateClusterDialogContent } from "./ClusterWizard/CreateClusterDialogContent"
import { Suspense } from "react"

interface CreateClusterWizardProps {
  isOpen: boolean
  onClose: () => void
  client: TrpcClient
}

const CreateClusterWizard: React.FC<CreateClusterWizardProps> = ({ isOpen, onClose, client }) => {
  const getCloudProfilesPromises = client.gardener.getCloudProfiles.query()

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      size="large"
      modalFooter={<div />}
      title={t`Create Cluster`}
      onConfirm={() => {
        onClose()
      }}
      children={
        <Suspense fallback={<Spinner>{t`Loading Gardener...`}</Spinner>}>
          <CreateClusterDialogContent
            isOpen={isOpen}
            onClose={onClose}
            client={client}
            getCloudProfilesPromises={getCloudProfilesPromises}
          />
        </Suspense>
      }
    ></Modal>
  )
}

export default CreateClusterWizard
