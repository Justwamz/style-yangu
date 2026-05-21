import { useState, useEffect } from 'react'

interface AuthState {
  token: string | null
  userId: string | null
  isLoading: boolean
}

export function useAuth(): AuthState & { signOut: () => void } {
  const [state, setState] = useState<AuthState>({ token: null, userId: null, isLoading: true })

  useEffect(() => {
    const token = localStorage.getItem('sy_token')
    const userId = localStorage.getItem('sy_user_id')
    setState({ token, userId, isLoading: false })
  }, [])

  function signOut() {
    localStorage.removeItem('sy_token')
    localStorage.removeItem('sy_user_id')
    setState({ token: null, userId: null, isLoading: false })
  }

  return { ...state, signOut }
}
