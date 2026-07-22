import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('customer' | 'vendor' | 'admin')[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  // Centered premium loading spinner during auth state resolution
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
          <p className="text-sm font-medium text-slate-500">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to home if user does not have the required role
  if (allowedRoles && user && !allowedRoles.includes(user.role as any)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
