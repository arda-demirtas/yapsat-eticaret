import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

interface Address {
  id: string
  title: string
  full_name: string
  phone_number: string
  street_address: string
  city: string
  state: string | null
  postal_code: string
  country: string
  is_default: boolean
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Türkiye')
  const [isDefault, setIsDefault] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const fetchAddresses = async () => {
    setLoading(true)
    try {
      const res = await api.get('/addresses/')
      if (res.data.success) {
        setAddresses(res.data.data)
      }
    } catch (err) {
      console.error('Adresler yüklenemedi', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)
    try {
      const res = await api.post('/addresses/', {
        title,
        full_name: fullName,
        phone_number: phoneNumber,
        street_address: streetAddress,
        city,
        state: state || null,
        postal_code: postalCode,
        country,
        is_default: isDefault
      })
      if (res.data.success) {
        setShowForm(false)
        resetForm()
        fetchAddresses()
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Adres eklenemedi')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Bu adresi silmek istediğinize emin misiniz?')) return
    try {
      const res = await api.delete(`/addresses/${id}`)
      if (res.data.success) {
        fetchAddresses()
      }
    } catch (err) {
      alert('Adres silinemedi')
    }
  }

  const handleMakeDefault = async (id: string) => {
    try {
      const res = await api.put(`/addresses/${id}`, { is_default: true })
      if (res.data.success) {
        fetchAddresses()
      }
    } catch (err) {
      alert('Varsayılan yapılamadı')
    }
  }

  const resetForm = () => {
    setTitle('')
    setFullName('')
    setPhoneNumber('')
    setStreetAddress('')
    setCity('')
    setState('')
    setPostalCode('')
    setCountry('Türkiye')
    setIsDefault(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 h-fit">
          <div className="text-center md:text-left">
            <div className="h-20 w-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto md:mx-0">
              {user?.first_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-slate-505 text-sm mt-1">{user?.email}</p>
            <span className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
              Rol: {user?.role === 'admin' ? 'Yönetici' : 'Müşteri'}
            </span>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-6">
            <button
              onClick={logout}
              className="w-full py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-red-650 hover:bg-red-750 cursor-pointer transition duration-150 ease-in-out"
            >
              Oturumu Kapat
            </button>
          </div>
        </div>

        {/* Addresses Management */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Kayıtlı Adreslerim</h3>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="py-2 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 cursor-pointer transition duration-150 ease-in-out"
                >
                  Yeni Adres Ekle
                </button>
              )}
            </div>

            {/* Add Address Form */}
            {showForm && (
              <form onSubmit={handleAddAddress} className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-800 text-md">Yeni Adres Bilgileri</h4>
                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md border-l-2 border-red-500">{formError}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Adres Başlığı (Örn: Ev, Ofis)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ev"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ad Soyad</label>
                    <input
                      type="text"
                      required
                      placeholder="Ahmet Yılmaz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Telefon Numarası</label>
                    <input
                      type="text"
                      required
                      placeholder="05555555555"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Açık Adres</label>
                    <input
                      type="text"
                      required
                      placeholder="Atatürk Mah. İstiklal Cad. No: 5"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">İlçe / Şehir</label>
                    <input
                      type="text"
                      required
                      placeholder="Kadıköy / İstanbul"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Bölge / Eyalet (Opsiyonel)</label>
                    <input
                      type="text"
                      placeholder="Marmara"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Posta Kodu</label>
                    <input
                      type="text"
                      required
                      placeholder="34710"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ülke</label>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 text-primary-600 border-slate-300 rounded"
                  />
                  <label htmlFor="isDefault" className="text-xs font-semibold text-slate-600">
                    Bu adresi varsayılan teslimat adresi yap
                  </label>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="py-2 px-4 rounded-lg text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="py-2 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 cursor-pointer disabled:opacity-50"
                  >
                    {formLoading ? 'Ekleniyor...' : 'Adresi Kaydet'}
                  </button>
                </div>
              </form>
            )}

            {/* Address List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Henüz kayıtlı bir teslimat adresi eklemediniz.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-5 rounded-xl border relative transition-all duration-200 ${
                      addr.is_default ? 'border-primary-500 bg-primary-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {addr.is_default && (
                      <span className="absolute top-4 right-4 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        Varsayılan
                      </span>
                    )}
                    <h4 className="font-bold text-slate-900 text-md pr-16">{addr.title}</h4>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{addr.full_name}</p>
                    <p className="text-xs text-slate-500">{addr.phone_number}</p>
                    <p className="mt-2 text-xs text-slate-600">
                      {addr.street_address}, {addr.city}, {addr.state ? `${addr.state}, ` : ''} {addr.postal_code}, {addr.country}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      {!addr.is_default ? (
                        <button
                          onClick={() => handleMakeDefault(addr.id)}
                          className="text-xs font-medium text-primary-600 hover:text-primary-800 cursor-pointer"
                        >
                          Varsayılan Yap
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Varsayılan Adres</span>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
