import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

interface Store {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  is_active: boolean
}

export default function StoreApply() {
  const [store, setStore] = useState<Store | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const navigate = useNavigate()

  useEffect(() => {
    fetchMyStore()
  }, [])

  const fetchMyStore = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/stores/my-store')
      if (response.data.success && response.data.data) {
        setStore(response.data.data)
      }
    } catch (err: any) {
      setError('Mağaza profili yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await api.post('/stores/apply', {
        name,
        description: description || null,
        logo_url: logoUrl || null
      })
      if (response.data.success) {
        setMessage('Mağaza başvurunuz başarıyla alındı. Yönetici onayından sonra satıcı paneline erişebilirsiniz.')
        setStore(response.data.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Başvuru gönderilirken bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (store) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-primary-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-black text-slate-900">Mağaza Profiliniz</h1>
          
          <div className="p-4 bg-slate-50/80 rounded-xl text-left border border-slate-100">
            <p className="text-xs font-bold text-slate-500">MAĞAZA ADI</p>
            <p className="text-base font-extrabold text-slate-900 mt-1">{store.name}</p>
            {store.description && (
              <>
                <p className="text-xs font-bold text-slate-500 mt-3">AÇIKLAMA</p>
                <p className="text-sm text-slate-600 mt-1">{store.description}</p>
              </>
            )}
          </div>

          {store.is_active ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-3 rounded-lg border border-emerald-200">
                Mağazanız aktif durumda! Hemen ürün eklemeye başlayabilirsiniz.
              </div>
              <button
                onClick={() => navigate('/vendor/dashboard')}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition shadow-md shadow-primary-200 cursor-pointer"
              >
                Satıcı Paneline Git
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-800 text-xs font-bold p-3 rounded-lg border border-amber-200">
              Başvurunuz inceleme aşamasındadır. Yönetici onayından sonra mağazanız aktif edilecektir.
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kendi Mağazanızı Açın</h1>
          <p className="text-sm text-slate-500 mt-1">YapSat pazar yerinde satıcı olarak ürünlerinizi listeleyip satmaya hemen başlayın.</p>
        </div>

        {message && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg">
            <p className="text-xs font-medium text-emerald-700">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-2">Mağaza Adı</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Tekno Market"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-primary-500 rounded-xl text-sm focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-2">Açıklama (Opsiyonel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mağazanız ve sattığınız ürünler hakkında bilgi verin..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-primary-500 rounded-xl text-sm focus:outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-2">Logo URL (Opsiyonel)</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-primary-500 rounded-xl text-sm focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition shadow-md shadow-primary-200 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Gönderiliyor...' : 'Başvuru Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
