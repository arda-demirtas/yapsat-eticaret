import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

export interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'guest' | 'customer' | 'vendor' | 'admin'
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, first_name?: string, last_name?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Interceptor to append Authorization header to all requests
    const requestInterceptor = api.interceptors.request.use((config) => {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`
      }
      return config
    })

    // Fetch user details if token exists
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        try {
          const res = await api.get('/auth/me')
          if (res.data.success) {
            setUser(res.data.data)
          } else {
            logout()
          }
        } catch (err) {
          logout()
        }
      }
      setIsLoading(false)
    }

    initAuth()

    return () => {
      api.interceptors.request.eject(requestInterceptor)
    }
  }, [token])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      if (res.data.success) {
        const { access_token, user: loggedUser } = res.data.data
        localStorage.setItem('token', access_token)
        setToken(access_token)
        setUser(loggedUser)
      } else {
        throw new Error(res.data.message || 'Login failed')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Giriş yapılamadı'
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, first_name?: string, last_name?: string) => {
    setIsLoading(true)
    try {
      const res = await api.post('/auth/register', { email, password, first_name, last_name })
      if (!res.data.success) {
        throw new Error(res.data.message || 'Registration failed')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Kayıt olunamadı'
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
