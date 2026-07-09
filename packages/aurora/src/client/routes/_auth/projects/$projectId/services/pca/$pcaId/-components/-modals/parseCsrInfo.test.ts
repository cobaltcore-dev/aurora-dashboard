import "reflect-metadata"
import { describe, it, expect } from "vitest"
import { parseCsrInfo } from "./parseCsrInfo"

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

describe("parseCsrInfo", () => {
  it("always returns 4 fields", async () => {
    const fields = await parseCsrInfo(CSR_BASIC)
    expect(fields).toHaveLength(4)
    expect(fields.map((f) => f.label)).toEqual([
      "Subject",
      "Public Key Algorithm",
      "Signature Algorithm",
      "Subject Alternative Names (SAN)",
    ])
  })

  it("parses subject correctly", async () => {
    const fields = await parseCsrInfo(CSR_BASIC)
    const subject = fields.find((f) => f.label === "Subject")
    expect(subject?.value).toContain("CN=test.example.com")
    expect(subject?.value).toContain("O=Test Org")
    expect(subject?.value).toContain("C=DE")
  })

  it("parses RSA public key algorithm with bit size", async () => {
    const fields = await parseCsrInfo(CSR_BASIC)
    const pubKey = fields.find((f) => f.label === "Public Key Algorithm")
    expect(pubKey?.value).toBe("RSA 2048-bit")
  })

  it("parses signature algorithm", async () => {
    const fields = await parseCsrInfo(CSR_BASIC)
    const sigAlg = fields.find((f) => f.label === "Signature Algorithm")
    expect(sigAlg?.value).toMatch(/RSASSA-PKCS1-v1_5|SHA-256/i)
  })

  it("shows — for SAN when no SAN extension present", async () => {
    const fields = await parseCsrInfo(CSR_BASIC)
    const san = fields.find((f) => f.label === "Subject Alternative Names (SAN)")
    expect(san?.value).toBe("—")
  })

  it("parses SAN DNS entries when present", async () => {
    const fields = await parseCsrInfo(CSR_WITH_SAN)
    const san = fields.find((f) => f.label === "Subject Alternative Names (SAN)")
    expect(san?.value).toContain("test.example.com")
    expect(san?.value).toContain("alt.example.com")
  })

  it("handles \\n-escaped PEM (pasted as single line)", async () => {
    const escaped = CSR_BASIC.replace(/\n/g, "\\n")
    const fields = await parseCsrInfo(escaped)
    expect(fields.find((f) => f.label === "Subject")?.value).toContain("CN=test.example.com")
  })

  it("throws on invalid PEM input", async () => {
    await expect(parseCsrInfo("not a csr")).rejects.toThrow()
  })
})
