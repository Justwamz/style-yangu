import { createApiClient } from '@style-yangu/api-client'

export const ADMIN_TOKEN_KEY = 'sy_admin_token'
export const adminApi = createApiClient(ADMIN_TOKEN_KEY)
