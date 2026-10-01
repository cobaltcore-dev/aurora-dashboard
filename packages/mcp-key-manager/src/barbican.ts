export interface BarbicanConfig {
  endpoint: string
  token: string
  projectId: string
}

export async function barbicanFetch(config: BarbicanConfig, path: string, params?: Record<string, string | number>) {
  const url = new URL(`${config.endpoint}/v1${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  }
  const res = await fetch(url, {
    headers: {
      "X-Auth-Token": config.token,
      "X-Project-Id": config.projectId,
    },
  })
  if (!res.ok) throw new Error(`Barbican ${res.status}: ${await res.text()}`)
  return res.json()
}
