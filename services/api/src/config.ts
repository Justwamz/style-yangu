export const JWT_SECRET = process.env.JWT_SECRET ?? (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET env var is required in production')
  }
  console.warn('[api] WARNING: JWT_SECRET not set — using dev fallback. Never deploy this.')
  return 'dev-secret-change-in-production'
})()
