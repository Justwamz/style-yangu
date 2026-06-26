export const JWT_SECRET = process.env.JWT_SECRET ?? (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET env var is required in production')
  }
  console.warn('[api] WARNING: JWT_SECRET not set — using dev fallback. Never deploy this.')
  return 'dev-secret-change-in-production'
})()

// ── Google Imagen 3 (Vertex AI) ──────────────────────────────────────────────
export const GOOGLE_CLOUD_PROJECT_ID  = process.env.GOOGLE_CLOUD_PROJECT_ID
export const GOOGLE_CLOUD_REGION      = process.env.GOOGLE_CLOUD_REGION ?? 'us-central1'
// Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON key file.
// On Render, paste the key JSON into the env var GOOGLE_SERVICE_ACCOUNT_JSON instead.
export const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

// ── Cloudflare R2 ────────────────────────────────────────────────────────────
export const CLOUDFLARE_ACCOUNT_ID          = process.env.CLOUDFLARE_ACCOUNT_ID
export const CLOUDFLARE_R2_ACCESS_KEY_ID    = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
export const CLOUDFLARE_R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
export const CLOUDFLARE_R2_BUCKET           = process.env.CLOUDFLARE_R2_BUCKET ?? 'style-yangu'
// Public URL of the R2 bucket (e.g. https://assets.styleyangu.com)
export const CLOUDFLARE_R2_PUBLIC_URL       = process.env.CLOUDFLARE_R2_PUBLIC_URL
