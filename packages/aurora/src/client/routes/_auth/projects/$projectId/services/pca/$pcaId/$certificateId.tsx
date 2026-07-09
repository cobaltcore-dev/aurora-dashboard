import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button, Spinner, Stack } from "@cloudoperators/juno-ui-components/index"
import { getServiceIndex } from "@/server/Authentication/helpers"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { trpcReact } from "@/client/trpcClient"
import { canAccessClavisPca } from "../-components/pcaAccess"
import { DetailsInfo } from "./-components/DetailsInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/services/pca/$pcaId/$certificateId")({
  staticData: {
    section: "services",
    service: "pca",
    analytics: {
      name: "services.pca.certificate.detail",
    },
    isDetail: true,
    sectionCrumb: { labelKey: "Services" },
    crumb: { labelKey: "PCA (Clavis)", to: "/projects/$projectId/services/pca" },
    intermediateCrumb: {
      useParentTitleAsLabel: true,
      useParamAsLabel: "pcaId",
      to: "/projects/$projectId/services/pca/$pcaId",
    },
  } satisfies RouteInfo,
  loader: async ({ context, params }) => {
    const cert = await context.trpcClient?.services.pca.getByIdCertificate.query({
      project_id: params.projectId,
      certificate_authority_id: params.pcaId,
      certificate_id: params.certificateId,
    })
    return { certTitle: cert ? `Certificate ${cert.id}` : null }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.certTitle ?? "Certificate" }],
  }),
  beforeLoad: async ({ context, params }) => {
    const availableServices = (await context.trpcClient?.auth.getAvailableServices.query()) || []
    const serviceIndex = getServiceIndex(availableServices)

    if (!canAccessClavisPca(serviceIndex, context.enabledServices)) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId: params.projectId },
      })
    }
  },
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId, pcaId, certificateId } = Route.useParams()

  const {
    isLoading,
    isError,
    error,
    data: certificate,
  } = trpcReact.services.pca.getByIdCertificate.useQuery({
    project_id: projectId,
    certificate_authority_id: pcaId,
    certificate_id: certificateId,
  })

  if (isLoading) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Certificate Details...</Trans>
      </Stack>
    )
  }

  const handleBack = () =>
    navigate({
      to: "/projects/$projectId/services/pca/$pcaId",
      params: { projectId, pcaId },
    })

  if (isError) {
    const errorMessage = error?.message || "Unknown error"
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-error font-semibold">
          <Trans>Error loading Certificate</Trans>
        </p>
        <p className="text-theme-highest">{errorMessage}</p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Certificate Authorities Details page</Trans>
        </Button>
      </Stack>
    )
  }

  if (!certificate) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-secondary">
          <Trans>Certificate not found</Trans>
        </p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Certificate Authorities Details page</Trans>
        </Button>
      </Stack>
    )
  }

  const certificateIdValue = certificate.id
  const certificateHeading = t`Certificate ${certificateIdValue}`
  const certificateDetails = t`${certificateIdValue} Certificate Details`

  const BASIC_INFO = [
    { label: t`CA ID`, value: certificate.certificate_authority_id },
    { label: t`ID`, value: certificateIdValue },
    {
      label: t`Duration/validity`,
      value:
        certificate.certificate?.validity.not_before !== undefined &&
        certificate.certificate?.validity.not_after !== undefined
          ? `${Math.round(
              (certificate.certificate.validity.not_after - certificate.certificate.validity.not_before) /
                (60 * 60 * 24)
            )} days`
          : undefined,
    },
  ] as const

  return (
    <Stack direction="vertical" gap="3">
      <div className="text-theme-default text-2xl font-semibold">{certificateDetails}</div>

      <p className="text-theme-highest text-sm">
        <Trans>Manage your Certificate</Trans>
      </p>

      <DetailsInfo basicInfo={BASIC_INFO} heading={certificateHeading} content={certificate?.certificate?.pem ?? ""} />
    </Stack>
  )
}
