import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import AdminDashboard from './pages/AdminDashboard'
import StoreApply from './pages/StoreApply'
import VendorDashboard from './pages/VendorDashboard'

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isVendor = user?.role === 'vendor'
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200/80 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Desktop Main Nav */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <img src="/logo.png" alt="YAPSAT Logo" className="h-9 w-auto rounded-lg object-contain bg-slate-50 border border-slate-100 p-0.5" />
              <span className="text-xl font-black text-slate-900 tracking-wider">YAPSAT</span>
            </Link>

          </div>

          {/* Desktop Right Nav Actions */}
          <div className="hidden md:flex items-center space-x-5">
            <Link to="/cart" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-all flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200/60">
              <svg className="h-4.5 w-4.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Sepetim</span>
            </Link>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link to="/admin/dashboard" className="text-sm font-black text-primary-600 hover:text-primary-700 transition">
                    Yönetici Paneli
                  </Link>
                )}
                {isVendor && (
                  <Link to="/vendor/dashboard" className="text-sm font-black text-amber-600 hover:text-amber-700 transition">
                    Satıcı Paneli
                  </Link>
                )}
                {!isVendor && !isAdmin && (
                  <Link to="/stores/apply" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition">
                    Satıcı Ol
                  </Link>
                )}
                <Link to="/orders" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition">
                  Siparişlerim
                </Link>
                <Link to="/profile" className="text-sm font-bold text-slate-700 hover:text-primary-600 transition bg-slate-50 hover:bg-slate-100 border border-slate-200/60 px-3.5 py-2 rounded-xl flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 text-xxs font-black flex items-center justify-center uppercase">
                    {user?.first_name?.charAt(0) || 'P'}
                  </div>
                  <span>{user?.first_name || 'Profilim'}</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-bold text-slate-400 hover:text-red-600 transition cursor-pointer"
                >
                  Çıkış
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition">
                  Giriş Yap
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-2 text-xs font-black text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition shadow-xs"
                >
                  Kaydol
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex items-center md:hidden gap-3">
            <Link to="/cart" className="relative p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 text-slate-600 hover:text-primary-600 transition">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </Link>
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none hover:bg-slate-100 rounded-xl border border-slate-200/60 cursor-pointer transition-all"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden bg-white/95 border-b border-slate-200/80 px-4 py-4 space-y-3 animate-fadeIn">

          
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-primary-600 hover:bg-primary-50 rounded-xl transition"
                >
                  Yönetici Paneli
                </Link>
              )}
              {isVendor && (
                <Link
                  to="/vendor/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-amber-600 hover:bg-amber-50 rounded-xl transition"
                >
                  Satıcı Paneli
                </Link>
              )}
              {!isVendor && !isAdmin && (
                <Link
                  to="/stores/apply"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                >
                  Satıcı Ol
                </Link>
              )}
              <Link
                to="/orders"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 text-sm font-bold text-slate-600 hover:text-primary-600 hover:bg-slate-50 rounded-xl transition"
              >
                Siparişlerim
              </Link>
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 text-sm font-bold text-slate-700 hover:text-primary-600 hover:bg-slate-50 rounded-xl transition"
              >
                Profilim ({user?.first_name || 'Üye'})
              </Link>
              <button
                onClick={() => {
                  logout()
                  setIsOpen(false)
                }}
                className="block w-full text-left px-3 py-2 text-sm font-bold text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-xl cursor-pointer transition"
              >
                Çıkış Yap
              </button>
            </>
          ) : (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block text-center px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition"
              >
                Giriş Yap
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="block text-center px-4 py-2.5 text-sm font-black text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition"
              >
                Kaydol
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stores/apply"
            element={
              <ProtectedRoute>
                <StoreApply />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} YapSat. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
