import { createApiClient } from '@style-yangu/api-client'

export const RESELLER_TOKEN_KEY = 'sy_token'
export const resellerApi = createApiClient(RESELLER_TOKEN_KEY)
