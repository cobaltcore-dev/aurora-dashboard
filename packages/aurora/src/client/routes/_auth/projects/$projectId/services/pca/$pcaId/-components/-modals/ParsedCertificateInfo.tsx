import { Fragment } from "react"
import { useQuery } from "@tanstack/react-query"
import { DescriptionList, DescriptionTerm, DescriptionDefinition } from "@cloudoperators/juno-ui-components/index"
import { parseCsrInfo, type PemFieldInfo } from "./parseCsrInfo"

interface ParsedCertificateInfoProps {
  csrCode: string
}

export const ParsedCertificateInfo = ({ csrCode }: ParsedCertificateInfoProps) => {
  const hasInput = csrCode.trim().length > 0

  const { data } = useQuery<PemFieldInfo[]>({
    // Include csrCode so each input value maps to its own parse result.
    queryKey: ["parsed-certificate-info", csrCode],
    queryFn: async () => parseCsrInfo(csrCode),
    enabled: hasInput,
    // Invalid/malformed CSR should quietly render no parsed info.
    retry: false,
  })

  const fields = data ?? []

  if (!fields.length) return null

  return (
    <DescriptionList alignTerms="right" className="mt-4 w-full">
      {fields.map(({ label, value }) => (
        <Fragment key={label}>
          <DescriptionTerm className="text-pretty">{label}</DescriptionTerm>
          <DescriptionDefinition>{value}</DescriptionDefinition>
        </Fragment>
      ))}
    </DescriptionList>
  )
}
