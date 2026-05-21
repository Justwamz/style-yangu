import express from 'express'
import helmet from 'helmet'
import { S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
})

const app = express()
const PORT = process.env.PORT ?? 3005

app.use(helmet())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'storage', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[storage] listening on port ${PORT}`)
})
