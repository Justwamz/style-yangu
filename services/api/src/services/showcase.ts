import { GoogleAuth } from 'google-auth-library'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { FaceCard } from '@style-yangu/types'
import {
  GOOGLE_CLOUD_PROJECT_ID,
  GOOGLE_CLOUD_REGION,
  GOOGLE_SERVICE_ACCOUNT_JSON,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET,
  CLOUDFLARE_R2_PUBLIC_URL,
} from '../config'

export type ShowcaseMode = 'full_body' | 'face_neck' | 'studio'

// ── Static face library ───────────────────────────────────────────────────────
// 20 curated faces (10F + 10M) representative of the East African market.
// thumbnailUrl: replace with Cloudflare R2 URLs once the real face library
// of 200-500 pre-generated Kenyan faces is produced via Imagen 3.
export const FACE_LIBRARY: FaceCard[] = [
  // Female faces
  { id: 'f01', gender: 'female', skinDepth: 'medium',       styleVibe: 'editorial',    thumbnailUrl: 'https://i.pravatar.cc/150?img=1'  },
  { id: 'f02', gender: 'female', skinDepth: 'deep',         styleVibe: 'everyday',     thumbnailUrl: 'https://i.pravatar.cc/150?img=5'  },
  { id: 'f03', gender: 'female', skinDepth: 'medium_deep',  styleVibe: 'corporate',    thumbnailUrl: 'https://i.pravatar.cc/150?img=9'  },
  { id: 'f04', gender: 'female', skinDepth: 'light_medium', styleVibe: 'streetwear',   thumbnailUrl: 'https://i.pravatar.cc/150?img=10' },
  { id: 'f05', gender: 'female', skinDepth: 'deep',         styleVibe: 'traditional',  thumbnailUrl: 'https://i.pravatar.cc/150?img=16' },
  { id: 'f06', gender: 'female', skinDepth: 'medium',       styleVibe: 'everyday',     thumbnailUrl: 'https://i.pravatar.cc/150?img=20' },
  { id: 'f07', gender: 'female', skinDepth: 'medium_deep',  styleVibe: 'editorial',    thumbnailUrl: 'https://i.pravatar.cc/150?img=25' },
  { id: 'f08', gender: 'female', skinDepth: 'light',        styleVibe: 'corporate',    thumbnailUrl: 'https://i.pravatar.cc/150?img=29' },
  { id: 'f09', gender: 'female', skinDepth: 'deep',         styleVibe: 'streetwear',   thumbnailUrl: 'https://i.pravatar.cc/150?img=32' },
  { id: 'f10', gender: 'female', skinDepth: 'medium',       styleVibe: 'traditional',  thumbnailUrl: 'https://i.pravatar.cc/150?img=47' },
  // Male faces
  { id: 'm01', gender: 'male',   skinDepth: 'medium_deep',  styleVibe: 'editorial',    thumbnailUrl: 'https://i.pravatar.cc/150?img=3'  },
  { id: 'm02', gender: 'male',   skinDepth: 'deep',         styleVibe: 'streetwear',   thumbnailUrl: 'https://i.pravatar.cc/150?img=7'  },
  { id: 'm03', gender: 'male',   skinDepth: 'medium',       styleVibe: 'corporate',    thumbnailUrl: 'https://i.pravatar.cc/150?img=12' },
  { id: 'm04', gender: 'male',   skinDepth: 'light_medium', styleVibe: 'everyday',     thumbnailUrl: 'https://i.pravatar.cc/150?img=15' },
  { id: 'm05', gender: 'male',   skinDepth: 'deep',         styleVibe: 'traditional',  thumbnailUrl: 'https://i.pravatar.cc/150?img=17' },
  { id: 'm06', gender: 'male',   skinDepth: 'medium_deep',  styleVibe: 'everyday',     thumbnailUrl: 'https://i.pravatar.cc/150?img=22' },
  { id: 'm07', gender: 'male',   skinDepth: 'medium',       styleVibe: 'streetwear',   thumbnailUrl: 'https://i.pravatar.cc/150?img=33' },
  { id: 'm08', gender: 'male',   skinDepth: 'deep',         styleVibe: 'editorial',    thumbnailUrl: 'https://i.pravatar.cc/150?img=52' },
  { id: 'm09', gender: 'male',   skinDepth: 'light',        styleVibe: 'corporate',    thumbnailUrl: 'https://i.pravatar.cc/150?img=57' },
  { id: 'm10', gender: 'male',   skinDepth: 'medium',       styleVibe: 'traditional',  thumbnailUrl: 'https://i.pravatar.cc/150?img=68' },
]

// ── Occasion → background description (spec §5.3) ────────────────────────────
const OCCASION_BACKGROUNDS: [string, string][] = [
  ['evening',     'warm moody dramatic lighting, upscale venue backdrop'],
  ['casual',      'bright natural daylight, relaxed outdoor setting'],
  ['office',      'clean neutral professional background'],
  ['traditional', 'warm cultural setting with wooden textures and natural light'],
  ['kitenge',     'warm cultural setting with wooden textures and natural light'],
  ['streetwear',  'urban Nairobi street — Westlands or CBD, clean matatu stage background'],
  ['street',      'urban Nairobi street — Westlands or CBD, clean matatu stage background'],
  ['upscale',     'modern Kilimani or Lavington interior'],
  ['garden',      'Karen or Runda garden setting, lush natural greenery'],
  ['beach',       'Diani coastal setting with Indian Ocean in background'],
  ['resort',      'Diani coastal setting with Indian Ocean in background'],
]

function backgroundFromTags(tags: string[]): string {
  const lower = tags.map(t => t.toLowerCase())
  for (const [keyword, background] of OCCASION_BACKGROUNDS) {
    if (lower.some(t => t.includes(keyword))) return background
  }
  return 'clean natural light studio setting'
}

// ── Prompt builder ────────────────────────────────────────────────────────────
export function buildPrompt(
  itemName: string,
  category: string,
  occasionTags: string[],
  mode: ShowcaseMode,
  face: FaceCard | null,
): string {
  const bg = backgroundFromTags(occasionTags)
  const modelDesc = face
    ? `${face.skinDepth.replace('_', '-')} skin-toned ${face.styleVibe} ${face.gender} East African model`
    : 'East African model'

  switch (mode) {
    case 'full_body':
      return [
        `Professional fashion photograph of a ${modelDesc} wearing ${itemName}.`,
        `${bg}.`,
        'Full body visible, natural Kenyan features, photorealistic,',
        'editorial fashion photography, sharp detail, 4K quality.',
        'Authentic East African aesthetic. No text, no watermarks, no logos.',
      ].join(' ')

    case 'face_neck':
      return [
        `Close-up portrait of a ${modelDesc} wearing ${itemName}.`,
        `${bg}.`,
        'Face and neck prominently visible, natural Kenyan features,',
        'photorealistic editorial fashion photography.',
        'No text, no watermarks, no logos.',
      ].join(' ')

    case 'studio':
      return [
        `Professional product photography of ${itemName}.`,
        `${category.toLowerCase() === 'shoes' ? 'Clean studio floor surface, soft even lighting from above and sides, subtle shadow.' : 'Neutral studio background, product centered, soft diffused lighting.'}`,
        'Crisp detail, e-commerce quality, multiple angles implied.',
        'No model, no text, no watermarks. White or light-grey background.',
      ].join(' ')
  }
}

// ── Google Imagen 3 via Vertex AI ─────────────────────────────────────────────
export async function generateWithImagen3(prompt: string): Promise<Buffer> {
  if (!GOOGLE_CLOUD_PROJECT_ID) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID env var is not set')
  }

  // Support either GOOGLE_APPLICATION_CREDENTIALS file path (local dev)
  // or GOOGLE_SERVICE_ACCOUNT_JSON env var (Render / CI environments)
  let authOptions: ConstructorParameters<typeof GoogleAuth>[0] = {
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  }
  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as object
    authOptions = { ...authOptions, credentials }
  }

  const auth = new GoogleAuth(authOptions)
  const client = await auth.getClient()
  const { token } = await client.getAccessToken()

  const endpoint = [
    `https://${GOOGLE_CLOUD_REGION}-aiplatform.googleapis.com/v1`,
    `projects/${GOOGLE_CLOUD_PROJECT_ID}`,
    `locations/${GOOGLE_CLOUD_REGION}`,
    'publishers/google/models/imagen-3.0-generate-001:predict',
  ].join('/')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '2:3',
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult',
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Imagen 3 returned ${res.status}: ${text}`)
  }

  const json = await res.json() as {
    predictions: Array<{ bytesBase64Encoded: string; mimeType: string }>
  }

  const b64 = json.predictions?.[0]?.bytesBase64Encoded
  if (!b64) throw new Error('Imagen 3 returned no image data')

  return Buffer.from(b64, 'base64')
}

// ── Cloudflare R2 upload ──────────────────────────────────────────────────────
export async function uploadToR2(buffer: Buffer, key: string): Promise<string> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID || !CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
    throw new Error('Cloudflare R2 env vars are not set (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY)')
  }
  if (!CLOUDFLARE_R2_PUBLIC_URL) {
    throw new Error('CLOUDFLARE_R2_PUBLIC_URL env var is not set')
  }

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  })

  await r2.send(new PutObjectCommand({
    Bucket: CLOUDFLARE_R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
  }))

  return `${CLOUDFLARE_R2_PUBLIC_URL}/${key}`
}

// ── isConfigured helpers ──────────────────────────────────────────────────────
export function imagenConfigured(): boolean {
  return !!GOOGLE_CLOUD_PROJECT_ID
}

export function r2Configured(): boolean {
  return !!(CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_R2_ACCESS_KEY_ID && CLOUDFLARE_R2_SECRET_ACCESS_KEY && CLOUDFLARE_R2_PUBLIC_URL)
}
