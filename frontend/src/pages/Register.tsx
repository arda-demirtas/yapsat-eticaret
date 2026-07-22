import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Register: React.FC = () => {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (password !== confirmPassword) {
      setError('Şifreler uyuşmuyor')
      return
    }

    setLoading(true)
    try {
      await register(email, password, firstName, lastName)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 transition-all duration-300 hover:shadow-2xl">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Yeni Hesap Oluşturun
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition duration-150 ease-in-out">
              Giriş yapın
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-green-700">Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...</p>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-md space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ad</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Ahmet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Soyad</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Yılmaz"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-posta Adresi</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="ornek@domain.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Şifre (Min. 6 karakter)</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Şifre Tekrar</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || success}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-150 ease-in-out cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register
