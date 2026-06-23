const BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001'

function makeRequest(tokenKey: string) {
  return async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(tokenKey) : null
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message ?? 'Request failed')
    }
    return res.json() as Promise<T>
  }
}

export function createApiClient(tokenKey: string) {
  const request = makeRequest(tokenKey)
  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}

export const apiClient = createApiClient('sy_token')
