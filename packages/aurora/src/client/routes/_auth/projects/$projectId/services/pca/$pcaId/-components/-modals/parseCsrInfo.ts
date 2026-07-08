import { Pkcs10CertificateRequest, SubjectAlternativeNameExtension } from "@peculiar/x509"

export interface PemFieldInfo {
  label: string
  value: string
}

const cleanPem = (pem: string) => {
  const clean = pem.replace(/\\n/g, "\n").trim()
  // Ensure header blocks are wrapping correctly if flattened
  if (clean.includes("-----BEGIN") && !clean.includes("\n")) {
    return clean
      .replace("-----BEGIN CERTIFICATE REQUEST-----", "-----BEGIN CERTIFICATE REQUEST-----\n")
      .replace("-----END CERTIFICATE REQUEST-----", "\n-----END CERTIFICATE REQUEST-----")
  }
  return clean
}

const formatAlgorithmLabel = (algorithm: KeyAlgorithm) => {
  const a = algorithm as KeyAlgorithm & { modulusLength?: number; namedCurve?: string }
  const upper = algorithm.name.toUpperCase()

  let base = algorithm.name
  if (["RSASSA-PKCS1-V1_5", "RSA-PSS", "RSA-OAEP"].includes(upper)) base = "RSA"
  else if (["ECDSA", "ECDH"].includes(upper)) base = "EC"
  else if (["ED25519", "EDDSA"].includes(upper)) base = "EdDSA"

  if (typeof a.modulusLength === "number") return `${base} ${a.modulusLength}-bit`
  if (typeof a.namedCurve === "string") return `${base} (${a.namedCurve})`
  return base
}

const formatSignatureAlgorithm = (alg: { name: string; hash?: { name: string } }) => {
  if (!alg) return "—"
  const hash = alg.hash?.name ? ` with ${alg.hash.name}` : ""
  return `${alg.name}${hash}`
}

export const parseCsrInfo = async (pem: string): Promise<PemFieldInfo[]> => {
  const sanitizedPem = cleanPem(pem)
  const csr = new Pkcs10CertificateRequest(sanitizedPem)
  const fields: PemFieldInfo[] = []

  // 1. Subject Identity
  fields.push({ label: "Subject", value: csr.subject || "—" })

  // 2. Encryption Details
  if (csr.publicKey) {
    fields.push({ label: "Public Key Algorithm", value: formatAlgorithmLabel(csr.publicKey.algorithm) })
  }

  // 3. Signature Details
  fields.push({ label: "Signature Algorithm", value: formatSignatureAlgorithm(csr.signatureAlgorithm) })

  // 4. SAN / Extension Mapping
  const sanRaw = csr.extensions.find((ext) => ext.type === "2.5.29.17")
  let sanValue = "—"
  if (sanRaw) {
    const sanExt = new SubjectAlternativeNameExtension(sanRaw.rawData)
    sanValue = sanExt.names.items.map((n) => `${n.type}: ${n.value}`).join(", ") || "—"
  }
  fields.push({ label: "Subject Alternative Names (SAN)", value: sanValue })

  return fields
}
