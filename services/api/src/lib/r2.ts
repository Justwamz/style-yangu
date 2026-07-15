import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET,
  CLOUDFLARE_R2_PUBLIC_URL,
} from '../config'

// Cloudflare R2 image pipeline. Required env vars at go-live:
//   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY,
//   CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_PUBLIC_URL

export function r2Configured(): boolean {
  return !!(
    CLOUDFLARE_ACCOUNT_ID &&
    CLOUDFLARE_R2_ACCESS_KEY_ID &&
    CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    CLOUDFLARE_R2_PUBLIC_URL
  )
}

let _client: S3Client | null = null
function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return _client
}

export async function uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await client().send(new PutObjectCommand({
    Bucket: CLOUDFLARE_R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
  return `${CLOUDFLARE_R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`
}

export async function deleteObject(key: string): Promise<void> {
  if (!r2Configured()) return
  try {
    await client().send(new DeleteObjectCommand({ Bucket: CLOUDFLARE_R2_BUCKET, Key: key }))
  } catch (err) {
    console.error('[r2] delete failed:', err)
  }
}

function parseDataUrl(value: string): { buffer: Buffer; contentType: string; ext: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(value)
  if (!m) return null
  const contentType = m[1]
  const buffer = Buffer.from(m[2], 'base64')
  const ext = (contentType.split('/')[1] ?? 'bin').split('+')[0]
  return { buffer, contentType, ext }
}

/**
 * Persists an image for durable storage.
 * - If `value` is a base64 data URL AND R2 is configured → uploads and returns the R2 public URL.
 * - Otherwise returns `value` unchanged (already a URL, or R2 not configured → keeps the data URL).
 * This makes every call site R2-ready with no behaviour change until credentials are set.
 */
export async function persistImage(value: string, keyPrefix: string): Promise<string> {
  if (!value || !value.startsWith('data:')) return value // already a URL
  if (!r2Configured()) return value                       // keep base64 until R2 is live
  const parsed = parseDataUrl(value)
  if (!parsed) return value
  try {
    const key = `${keyPrefix.replace(/^\/|\/$/g, '')}/${Date.now()}-${randomUUID().slice(0, 8)}.${parsed.ext}`
    return await uploadBuffer(parsed.buffer, key, parsed.contentType)
  } catch (err) {
    console.error('[r2] persistImage failed, falling back to data URL:', err)
    return value
  }
}
