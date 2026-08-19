import "reflect-metadata"
import { describe, it, expect } from "vitest"
import { isValidCertificateChain, isValidCsr, parseCsrInfo } from "./parseCsrInfo"

// RSA 2048, subject: CN=test.example.com, O=Test Org, C=DE, no SAN
const CSR_BASIC = `-----BEGIN CERTIFICATE REQUEST-----
MIICgDCCAWgCAQAwOzEZMBcGA1UEAwwQdGVzdC5leGFtcGxlLmNvbTERMA8GA1UE
CgwIVGVzdCBPcmcxCzAJBgNVBAYTAkRFMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
MIIBCgKCAQEAs8Y7p9Da7wB5j+7J9DMULEOnP4gM1HuxjP6N+R6UTRATDJ/+dK/c
HNVof001t8f3t77YU0dX4htntfUCtJsoWXY66FVMByWeurG2dGyeuBV0jL+tgwok
N1Ezv7Y7T4c1MpOSYQ3wro5yHPeJMTh/KDZN9k1loeU1qgOa3yY+cwACzW1pSn7P
5xb6Hwnuzu1/YM43q5dsM6lSdIQ7LQ0dfzDWLK6sXePz0BAIx32ZJm//QsHb1mD9
DIzAvFWLrVLi7g39Qg/IqPbksfhxjdw10tHEW4G3Padco/TS3zy7lSvJcY0x8Esn
vLOvZ/im4zJqnWBQsheTfOdlIfSXyI9q9QIDAQABoAAwDQYJKoZIhvcNAQELBQAD
ggEBADviwIikxRCC51ZhVtuPZVl4tyLa97sCSPCOwMosQMqkmkxxRmJqjmg07Vj/
IV+ErYvV9nrRMIhc9Aui5Fdx7+xqGyd0HVu4154x2VOWErX/1rqoNMRZJL9cFrOI
l6Er8O+vnqe5vQo5ohAfpDS5Q17dcHk6cPEqOoKBuRtHih7mQFCSVClGCO/sN2cz
nA06/3erJCrKyFjzJ1yr33oaWhTCPsh/cSNDgDXbudldzI4a2Y6F31cYEGxNXOMW
JRwFksQMClkKtlJaj2WPlp5S3Slq81XgcrNpBY1WsX8VALN0DtOpiURA5tyQgyuu
tbgpUiV47+sOX6s+F++CbpbTor8=
-----END CERTIFICATE REQUEST-----`

// RSA 2048, subject: CN=test.example.com, SANs: DNS:test.example.com, DNS:alt.example.com
const CSR_WITH_SAN = `-----BEGIN CERTIFICATE REQUEST-----
MIICnzCCAYcCAQAwGzEZMBcGA1UEAwwQdGVzdC5leGFtcGxlLmNvbTCCASIwDQYJ
KoZIhvcNAQEBBQADggEPADCCAQoCggEBAJwC5wYc6b+a6+fJsq2nJYLpEj6gCPrA
K63FFZKu4AupXcAAY6KeeJc+vfJMuXZ8Nhe2W5DLmqjErr7cBniVIPul4Z1ZwMI1
/vqF0sRu7+mj7N8Ig+CqNY9UPm1eg74op8PszhbkASHmpdwFV9SqRSPHQHMsB+nb
UMKtnU5MESYK1INacPw2HXZhJJrsA24ub4z8De2xYoL0zJV0lvB3OLZFjU4wvunH
ReD/MH60q8M7MegqCMquoNVrjx/kAP2Httyj2jaaJ3Cn8vIeHjgD3sfDQ+v04Lop
Jlok2p3SNryRxP7NSQtoStrlgfA/K22yXgNWpi+ZwzXeD+l+srS/TA8CAwEAAaA/
MD0GCSqGSIb3DQEJDjEwMC4wLAYDVR0RBCUwI4IQdGVzdC5leGFtcGxlLmNvbYIP
YWx0LmV4YW1wbGUuY29tMA0GCSqGSIb3DQEBCwUAA4IBAQCT342/dYB221cGE9X8
qrBNi2ukUnVrVzR3WUt4xk7bMHQXba+SQwqjShUAfqEDXeTEfM6ChZSfmGG7RInZ
RRI6ztDTNWN8GNQz7NqfxZs9D3q0h3vRWdq1h8p3uRlxurlu6VEw55S3Ff+Uv1WS
G3q6tre5w/asLD4n6JrHmm6xg6qlcOqatYsy8tL5/LgpHvNSClSF/GVqi3RaKUVL
+pawfMxEoma0SRS9YAp70n0CLKbJuu/ri07ztkHQl0tt8oBETgHX3a+mXz5Ch0kB
7SpeIpR3AZJi3kuKL+c9sctAq7EF7wVGi1exgn5Wf20otTWZUkK3cuJFTZMldeAp
aEjH
-----END CERTIFICATE REQUEST-----`

const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIEFDCCAfygAwIBAgIJAO6kqfCzh4CfMA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNV
BAMMCURlbW8gUm9vdDAeFw0yNjA4MTMxMTI5MjZaFw0yNjA4MTQxMTI5MjZaMCAx
HjAcBgNVBAMMFW1hcnRhZGVtby1jYS50ZXN0LnNjaTCCASIwDQYJKoZIhvcNAQEB
BQADggEPADCCAQoCggEBANOVuypqrI03ndDl1Qsnq52Mc/vi+XNUEn7ewWt9GSDx
SZWG5RVgTcuqKALmjocqhDNvCCMQ3NpaKxBxPmMgbrxJi/3dD57dQHDBWul9ED59
57oSXa0sWsFx3Zrei1bX3T4bG1UYpUhxhSzl3RV6mmJTYHqGpQUCYl5825miLnkQ
1e5B3TtmrvLdU5UhnlRuuRsfqwCGCMiLfZUHSl1lil2yLg7Ba9RPpCz/yHWjO6B5
DC5rOKIULI5idbIkBBnDhQ+pcyLX4Wjijas9Y8oJtUFnpY6HrQiGrZrWrApGIOus
cSPBoV2O2bKzyX61zoDVCL6aJxlWOpimnHH/12oBuwcCAwEAAaNdMFswEgYDVR0T
AQH/BAgwBgEB/wIBADAdBgNVHQ4EFgQUv1Pcg3sSxOiWEiC/lpL2fpoy7lswDgYD
VR0PAQH/BAQDAgEGMBYGA1UdJQEB/wQMMAoGCCsGAQUFBwMBMA0GCSqGSIb3DQEB
CwUAA4ICAQABg7VgonMaTksSfHXSgZPHPXY7tk8E5v6+PH8QE88IFZekr2kKFkD0
uRWPUAp4egs3pH5yViEnl42oYJG1AMBFAFM6ksDOgIeg1ypYZnmGNbhZP8WiUPoo
qjY5NY8O5XvQZdRBlTf7KDnXQ3awNdGEwFpr3TMTanE7nwmBiBGVBMs+qUiFZwmi
dKkJh83rjMcj8HNbvocgd9uL5Tob74FnuH2jBz5t3PX9GejXmXv/tZ9dpoAju1S6
BtDH3+jVv08VHJvnWIyXjtAdYJexE39fbO5DGvhWGvTTEvlMyD+YvQmnM6Rka8YP
+h8ZTpAh0BzUDJp1LPWYvKdZYqmWbJ2DU6DYBxJhjxsNDFTdQRFeaaaErN2stvGT
eUURlusndBwpFmKNovTqEHqAhQJgKZx/Bmr7whadMGxCh4KzB/Xi3G5UHwx8Hyxl
kXJ421e53fGk1o1Sd56ZtQl0uaWFn7G87cJrsFPSOsaERUS1gjl6VZhxxN9ucQMq
6lkDc2IDCJDKX5V5iwURVYHJAIxu4VQbwfNNihF2CPHqFSxiBK6wbzxoVXWRt/qZ
MhUIQKnDRZgzXdF1tuCQ4eCplH/+GcTJwwpPHvaUjb8WCzMmPnH6qwcK1petLMHA
/8321TmfPsI9OYB1L9x+XzWcVZ8lvMiMHWbLEK1xbQvBpgNhYSf3Zg==
-----END CERTIFICATE-----`

describe("parseCsrInfo", () => {
  it("always returns 4 fields", () => {
    const fields = parseCsrInfo(CSR_BASIC)
    expect(fields).toHaveLength(4)
    expect(fields.map((f) => f.label)).toEqual([
      "Subject Information",
      "Public Key Algorithm",
      "Signature Algorithm",
      "Subject Alternative Names (SAN)",
    ])
  })

  it("parses subject correctly", () => {
    const fields = parseCsrInfo(CSR_BASIC)
    const subject = fields.find((f) => f.label === "Subject Information")
    expect(subject?.value).toContain("CN=test.example.com")
    expect(subject?.value).toContain("O=Test Org")
    expect(subject?.value).toContain("C=DE")
  })

  it("parses RSA public key algorithm with bit size", () => {
    const fields = parseCsrInfo(CSR_BASIC)
    const pubKey = fields.find((f) => f.label === "Public Key Algorithm")
    expect(pubKey?.value).toBe("RSA 2048-bit")
  })

  it("parses signature algorithm", () => {
    const fields = parseCsrInfo(CSR_BASIC)
    const sigAlg = fields.find((f) => f.label === "Signature Algorithm")
    expect(sigAlg?.value).toMatch(/RSASSA-PKCS1-v1_5|SHA-256/i)
  })

  it("shows — for SAN when no SAN extension present", () => {
    const fields = parseCsrInfo(CSR_BASIC)
    const san = fields.find((f) => f.label === "Subject Alternative Names (SAN)")
    expect(san?.value).toBe("—")
  })

  it("parses SAN DNS entries when present", () => {
    const fields = parseCsrInfo(CSR_WITH_SAN)
    const san = fields.find((f) => f.label === "Subject Alternative Names (SAN)")
    expect(san?.value).toContain("test.example.com")
    expect(san?.value).toContain("alt.example.com")
  })

  it("handles \\n-escaped PEM (pasted as single line)", () => {
    const escaped = CSR_BASIC.replace(/\n/g, "\\n")
    const fields = parseCsrInfo(escaped)
    expect(fields.find((f) => f.label === "Subject Information")?.value).toContain("CN=test.example.com")
  })

  it("throws on invalid PEM input", () => {
    expect(() => parseCsrInfo("not a csr")).toThrow()
  })

  it("parses certificate metadata and chain size", () => {
    const fields = parseCsrInfo(CERTIFICATE)

    expect(fields.find((f) => f.label === "Subject Information")?.value).toContain("martademo-ca.test.sci")
    expect(fields.find((f) => f.label === "Public Key Algorithm")?.value).toBe("RSA 2048-bit")
    expect(fields.find((f) => f.label === "Certificate Chain Size")?.value).toMatch(/^\d+ bytes$/)
  })

  it("accepts escaped certificate PEM", () => {
    const escaped = CERTIFICATE.replace(/\n/g, "\\n")

    expect(parseCsrInfo(escaped)).toEqual(
      expect.arrayContaining([
        { label: "Subject Information", value: expect.stringContaining("martademo-ca.test.sci") },
      ])
    )
  })

  it("validates certificate chains and rejects non-certificate PEM", () => {
    expect(isValidCertificateChain(CERTIFICATE)).toBe(true)
    expect(isValidCertificateChain(CSR_BASIC)).toBe(false)
    expect(isValidCertificateChain("not a certificate")).toBe(false)
  })

  it("validates CSRs and rejects certificates", () => {
    expect(isValidCsr(CSR_BASIC)).toBe(true)
    expect(isValidCsr(CSR_BASIC.replace(/\n/g, "\\n"))).toBe(true)
    expect(isValidCsr(CERTIFICATE)).toBe(false)
    expect(isValidCsr("not a csr")).toBe(false)
  })
})
