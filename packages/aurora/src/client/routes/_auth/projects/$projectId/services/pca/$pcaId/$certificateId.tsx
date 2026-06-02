import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { trpcReact } from "@/client/trpcClient"
import {
  Button,
  DescriptionDefinition,
  DescriptionList,
  DescriptionTerm,
  Divider,
  Spinner,
  Stack,
} from "@cloudoperators/juno-ui-components/index"
import { Trans, useLingui } from "@lingui/react/macro"
import { MdContentCopy, MdDownload } from "react-icons/md"
import { Fragment } from "react/jsx-runtime"

export const Route = createFileRoute("/_auth/projects/$projectId/services/pca/$pcaId/$certificateId")({
  staticData: { section: "services", service: "pca", isDetail: true, sectionCrumb: { label: "Services", to: "/projects/$projectId/services/overview" }, crumb: { label: "PCA (Clavis)", to: "/projects/$projectId/services/pca" } } satisfies RouteInfo,
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

  // Loading state
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

  // Error state
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

  // No data state
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

  const basicInfo = [
    { label: t`CA ID`, value: certificate.certificate_authority_id },
    { label: t`ID`, value: certificate.id },
    {
      label: t`Duration/validity`,
      value:
        certificate.configuration?.validity.not_before !== undefined &&
        certificate.configuration?.validity.not_after !== undefined
          ? `${Math.round(
              (certificate.configuration.validity.not_after - certificate.configuration.validity.not_before) /
                (60 * 60 * 24)
            )} days`
          : undefined,
    },
  ] as const

  return (
    <Stack direction="vertical" gap="3">
      <div className="text-theme-default text-2xl font-semibold">{`${certificate.id} Certificate Details`}</div>

      <p className="text-theme-highest text-sm">
        <Trans>Manage your Certificate</Trans>
      </p>

      <Stack gap="4" className="grid grid-cols-2 items-start">
        <DescriptionList alignTerms="right" className="w-full">
          {basicInfo.map(({ label, value }) => (
            <Fragment key={label}>
              <DescriptionTerm>{label}</DescriptionTerm>
              <DescriptionDefinition>{value || "—"}</DescriptionDefinition>
            </Fragment>
          ))}
        </DescriptionList>

        <div className="bg-dt-background w-full rounded-sm">
          <div className="text-theme-default p-4 text-xl font-bold">Certificate {`${certificate.id}`}</div>
          <Divider />

          <div className="p-4 text-sm break-all whitespace-pre-wrap">{certificate?.csr}</div>

          {/* I will implement downloading-copying functionality at issue/import part of the epic as I need to clarify some stuff with design-clavis team */}
          <Divider />
          <Stack gap="2" distribution="end" className="p-4">
            <Button>
              <MdDownload />
            </Button>
            <Button>
              <MdContentCopy />
            </Button>
          </Stack>
        </div>
      </Stack>
    </Stack>
  )
}
