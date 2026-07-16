import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getMe, login as loginRequest, logout as logoutRequest, register as registerRequest } from './api/authApi'
import type { LoginRequest, RegisterRequest, User } from './types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (credentials: LoginRequest) => Promise<User>
  register: (data: RegisterRequest) => Promise<User>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadCurrentUser() {
      try {
        const me = await getMe()
        if (active) {
          setUser(me)
        }
      } catch {
        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadCurrentUser()

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    const me = await loginRequest(credentials)
    setUser(me)
    return me
  }, [])

  // Register, then sign in so the new account is authenticated and ready for Dashboard.
  const register = useCallback(
    async (data: RegisterRequest) => {
      await registerRequest(data)
      const me = await loginRequest({ email: data.email, password: data.password })
      setUser(me)
      return me
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refreshMe }),
    [user, loading, login, register, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
