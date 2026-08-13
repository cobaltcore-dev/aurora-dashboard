import "reflect-metadata"
import { Extension, Pkcs10CertificateRequest, SubjectAlternativeNameExtension, X509Certificate } from "@peculiar/x509"

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

const certificateBlockPattern = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g

const parseCertificateChain = (pem: string) => {
  const certificateBlocks = pem.match(certificateBlockPattern)
  if (!certificateBlocks || certificateBlocks.join("").replace(/\s/g, "") !== pem.replace(/\s/g, "")) {
    throw new Error("Invalid PEM certificate chain")
  }

  return certificateBlocks.map((certificate) => new X509Certificate(certificate))
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

export const parseCsrInfo = (pem: string): PemFieldInfo[] => {
  const sanitizedPem = cleanPem(pem)
  const fields: PemFieldInfo[] = []

  if (sanitizedPem.includes("-----BEGIN CERTIFICATE-----")) {
    const [certificate] = parseCertificateChain(sanitizedPem)

    fields.push({ label: "Subject", value: certificate.subject || "—" })
    fields.push({ label: "Public Key Algorithm", value: formatAlgorithmLabel(certificate.publicKey.algorithm) })
    fields.push({ label: "Signature Algorithm", value: formatSignatureAlgorithm(certificate.signatureAlgorithm) })
    fields.push({ label: "Subject Alternative Names (SAN)", value: getSanValue(certificate.extensions) })
    fields.push({
      label: "Certificate Chain Size",
      value: `${new TextEncoder().encode(sanitizedPem).byteLength} bytes`,
    })
    return fields
  }

  const csr = new Pkcs10CertificateRequest(sanitizedPem)

  // 1. Subject Identity
  fields.push({ label: "Subject", value: csr.subject || "—" })

  // 2. Encryption Details
  if (csr.publicKey) {
    fields.push({ label: "Public Key Algorithm", value: formatAlgorithmLabel(csr.publicKey.algorithm) })
  }

  // 3. Signature Details
  fields.push({ label: "Signature Algorithm", value: formatSignatureAlgorithm(csr.signatureAlgorithm) })

  // 4. SAN / Extension Mapping
  fields.push({ label: "Subject Alternative Names (SAN)", value: getSanValue(csr.extensions) })

  return fields
}

const getSanValue = (extensions: Extension[]) => {
  const sanRaw = extensions.find((ext) => ext.type === "2.5.29.17")
  if (!sanRaw) return "—"

  const sanExt = new SubjectAlternativeNameExtension(sanRaw.rawData)
  return sanExt.names.items.map((n) => `${n.type}: ${n.value}`).join(", ") || "—"
}

export const isValidPem = (pem: string) => {
  try {
    const sanitizedPem = cleanPem(pem)
    if (sanitizedPem.includes("-----BEGIN CERTIFICATE-----")) {
      parseCertificateChain(sanitizedPem)
    } else {
      new Pkcs10CertificateRequest(sanitizedPem)
    }
    return true
  } catch {
    return false
  }
}

export const isValidCertificateChain = (pem: string) => {
  try {
    parseCertificateChain(cleanPem(pem))
    return true
  } catch {
    return false
  }
}
