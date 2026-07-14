import { GoogleAuth } from 'google-auth-library'

// Required env vars:
//   GOOGLE_CLOUD_PROJECT_ID       — GCP project ID
//   GOOGLE_SERVICE_ACCOUNT_JSON   — full service account key JSON as a string
//   GOOGLE_CLOUD_REGION           — optional, defaults to us-central1

export function configured(): boolean {
  return !!(process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
}

let _auth: GoogleAuth | null = null

function getAuth(): GoogleAuth {
  if (!_auth) {
    _auth = new GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })
  }
  return _auth
}

async function getToken(): Promise<string> {
  const client = await getAuth().getClient()
  const res = await client.getAccessToken()
  if (!res.token) throw new Error('Failed to get GCP access token')
  return res.token
}

function apiBase(): string {
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID!
  const region = process.env.GOOGLE_CLOUD_REGION ?? 'us-central1'
  return `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models`
}

export async function geminiText(prompt: string): Promise<string> {
  const token = await getToken()
  const url = `${apiBase()}/gemini-1.5-pro:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini text ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  return data.candidates[0]?.content?.parts[0]?.text ?? ''
}

export async function geminiVision(
  prompt: string,
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const token = await getToken()
  const url = `${apiBase()}/gemini-1.5-pro:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini vision ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  return data.candidates[0]?.content?.parts[0]?.text ?? ''
}

export async function imagenGenerate(prompt: string): Promise<string> {
  const token = await getToken()
  const url = `${apiBase()}/imagen-3.0-generate-001:predict`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '3:4', safetyFilterLevel: 'block_some' },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Imagen ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json() as { predictions: { bytesBase64Encoded: string }[] }
  const b64 = data.predictions[0]?.bytesBase64Encoded
  if (!b64) throw new Error('Imagen returned no image')
  return `data:image/png;base64,${b64}`
}

export function parseJsonResponse<T>(text: string): T {
  const clean = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(clean) as T
}
