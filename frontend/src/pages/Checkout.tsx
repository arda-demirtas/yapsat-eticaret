import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
}

interface Product {
  id: string
  name: string
  price: number
}

interface CartItem {
  id: string
  quantity: number
  product: Product
}

export default function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // State variables
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [processing, setProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  // Inline address creation form
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(false)
  const [newAddress, setNewAddress] = useState({
    title: '',
    full_name: '',
    phone_number: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
  })

  // Card information
  const [cardInfo, setCardInfo] = useState({
    holder: '',
    number: '',
    expiry: '',
    cvc: '',
  })

  // Coupon code passed from Cart page
  const couponCode = location.state?.couponCode || ''
  const [appliedCouponValue, setAppliedCouponValue] = useState<number>(0)
  const [appliedCouponType, setAppliedCouponType] = useState<'percentage' | 'fixed' | null>(null)

  useEffect(() => {
    fetchCheckoutData()
  }, [])

  const fetchCheckoutData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch addresses
      const addressRes = await api.get('/addresses/')
      if (addressRes.data.success) {
        const addrList: Address[] = addressRes.data.data
        setAddresses(addrList)
        // Auto-select first address if any
        if (addrList.length > 0) {
          setSelectedAddressId(addrList[0].id)
        }
      }

      // 2. Fetch cart items
      const cartRes = await api.get('/cart/')
      if (cartRes.data.success) {
        setCartItems(cartRes.data.data)
      }

      // 3. If there was a coupon, validate it to display coupon discount
      if (couponCode) {
        const sub = cartRes.data.data.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0)
        try {
          const couponRes = await api.get(`/coupons/validate?code=${encodeURIComponent(couponCode)}&cart_total=${sub}`)
          if (couponRes.data.success) {
            setAppliedCouponValue(couponRes.data.data.value)
            setAppliedCouponType(couponRes.data.data.discount_type)
          }
        } catch (couponErr) {
          console.error('Kupon doğrulanamadı:', couponErr)
        }
      }
    } catch (err: any) {
      setError('Ödeme bilgileri yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Handle address creation
  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const response = await api.post('/addresses/', newAddress)
      if (response.data.success) {
        const createdAddr: Address = response.data.data
        setAddresses([...addresses, createdAddr])
        setSelectedAddressId(createdAddr.id)
        setShowNewAddressForm(false)
        setNewAddress({
          title: '',
          full_name: '',
          phone_number: '',
          street_address: '',
          city: '',
          state: '',
          postal_code: '',
        })
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Adres eklenirken bir hata oluştu.')
    }
  }

  // Handle payment processing
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAddressId) {
      alert('Lütfen teslimat adresi seçin.')
      return
    }
    if (cardInfo.number.replace(/\s+/g, '').length !== 16) {
      alert('Lütfen geçerli 16 haneli kart numarası girin.')
      return
    }

    setProcessing(true)
    setError('')

    try {
      // Step 1: Create Order
      const orderResponse = await api.post('/orders/create', {
        shipping_address_id: selectedAddressId,
        coupon_code: couponCode || null,
      })

      if (orderResponse.data.success) {
        const orderId = orderResponse.data.data.id

        // Step 2: Process Charge
        const paymentResponse = await api.post('/payments/charge', {
          order_id: orderId,
          card_holder: cardInfo.holder,
          card_number: cardInfo.number.replace(/\s+/g, ''),
          cvc: cardInfo.cvc,
        })

        if (paymentResponse.data.success) {
          alert('Ödemeniz başarıyla tamamlandı! Siparişleriniz sayfasına yönlendiriliyorsunuz.')
          navigate('/orders')
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Sipariş veya ödeme işlemi başarısız oldu.')
    } finally {
      setProcessing(false)
    }
  }

  // Calculation logic
  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  
  let discount = 0
  if (appliedCouponType === 'percentage') {
    discount = subtotal * (appliedCouponValue / 100)
  } else if (appliedCouponType === 'fixed') {
    discount = Math.min(appliedCouponValue, subtotal)
  }

  const netTotal = subtotal - discount
  const isFreeShipping = netTotal >= 100
  const shippingFee = cartItems.length > 0 ? (isFreeShipping ? 0 : 10) : 0
  const grandTotal = netTotal + shippingFee

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Ödeme & Sipariş</h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 shadow-xs">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Address Selection and Card Info */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Address Block */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Teslimat Adresi</h2>
              <button
                type="button"
                onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 cursor-pointer"
              >
                {showNewAddressForm ? 'Adres Seçimine Dön' : '+ Yeni Adres Ekle'}
              </button>
            </div>

            {!showNewAddressForm ? (
              addresses.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                  <p className="text-sm text-slate-500 mb-4">Kayıtlı teslimat adresiniz bulunmuyor.</p>
                  <button
                    onClick={() => setShowNewAddressForm(true)}
                    className="px-4 py-2 bg-primary-600 text-white font-bold text-xs rounded-lg hover:bg-primary-700 cursor-pointer"
                  >
                    Adres Ekle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`block p-4 rounded-lg border cursor-pointer transition relative ${
                        selectedAddressId === addr.id
                          ? 'border-primary-600 bg-primary-50/30 ring-2 ring-primary-100'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="selected_address"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="sr-only"
                      />
                      <span className="block text-xs font-extrabold text-slate-900 mb-1">
                        {addr.title}
                      </span>
                      <span className="block text-xs font-bold text-slate-700">{addr.full_name}</span>
                      <span className="block text-xxs text-slate-500 mt-1 leading-relaxed">
                        {addr.street_address}, {addr.city} / {addr.state || ''} ({addr.postal_code})
                      </span>
                      <span className="block text-xxs text-slate-400 mt-2">📞 {addr.phone_number}</span>
                    </label>
                  ))}
                </div>
              )
            ) : (
              <form onSubmit={handleCreateAddress} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Adres Başlığı (örn: Ev)</label>
                    <input
                      type="text"
                      required
                      value={newAddress.title}
                      onChange={(e) => setNewAddress({ ...newAddress, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Ad Soyad</label>
                    <input
                      type="text"
                      required
                      value={newAddress.full_name}
                      onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Telefon</label>
                    <input
                      type="text"
                      required
                      value={newAddress.phone_number}
                      onChange={(e) => setNewAddress({ ...newAddress, phone_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Açık Adres</label>
                    <input
                      type="text"
                      required
                      value={newAddress.street_address}
                      onChange={(e) => setNewAddress({ ...newAddress, street_address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Şehir</label>
                    <input
                      type="text"
                      required
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">İlçe</label>
                    <input
                      type="text"
                      required
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Posta Kodu</label>
                    <input
                      type="text"
                      required
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Adresi Kaydet
                </button>
              </form>
            )}
          </div>

          {/* Payment Block */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Kart Bilgileri</h2>
            
            <div className="bg-slate-50 p-3 rounded-lg text-xxs text-slate-500 mb-6 leading-relaxed">
              💡 <strong>Test Ortamı Simülasyonu:</strong> Güvenli ödeme akışını başarılı tamamlamak için 
              kart numarasını <strong>"4000"</strong> ile başlayacak şekilde giriniz (örn: <code>4000111122223333</code>).
              Diğer kart numaraları yetersiz bakiye simülasyonunu tetikler.
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Kart Sahibi</label>
                  <input
                    type="text"
                    required
                    placeholder="Ad Soyad"
                    value={cardInfo.holder}
                    onChange={(e) => setCardInfo({ ...cardInfo, holder: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Kart Numarası</label>
                  <input
                    type="text"
                    required
                    placeholder="4000 1111 2222 3333"
                    maxLength={16}
                    value={cardInfo.number}
                    onChange={(e) => setCardInfo({ ...cardInfo, number: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">S.K.T</label>
                    <input
                      type="text"
                      required
                      placeholder="AA/YY"
                      maxLength={5}
                      value={cardInfo.expiry}
                      onChange={(e) => setCardInfo({ ...cardInfo, expiry: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">CVC</label>
                    <input
                      type="password"
                      required
                      maxLength={3}
                      placeholder="***"
                      value={cardInfo.cvc}
                      onChange={(e) => setCardInfo({ ...cardInfo, cvc: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Order Submission Button */}
              <button
                type="submit"
                disabled={processing || cartItems.length === 0}
                className="w-full mt-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm text-center transition cursor-pointer"
              >
                {processing ? 'İşleminiz Yapılıyor...' : 'Ödeme Yap ve Siparişi Tamamla'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Order Summary */}
        <div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 sticky top-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Sipariş Özeti
            </h3>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-xs gap-3">
                  <span className="text-slate-600 truncate flex-grow">
                    {item.product.name} <strong className="text-slate-900 text-xxs">x{item.quantity}</strong>
                  </span>
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 text-xs">
                <span>Ara Toplam</span>
                <span>
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(subtotal)}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium text-xs">
                  <span>İndirim ({couponCode})</span>
                  <span>
                    -
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(discount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 text-xs">
                <span>Kargo Ücreti</span>
                {shippingFee === 0 ? (
                  <span className="text-emerald-600 font-semibold">Ücretsiz</span>
                ) : (
                  <span>
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(shippingFee)}
                  </span>
                )}
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="flex justify-between text-base font-extrabold text-slate-900">
              <span>Toplam Tutar</span>
              <span>
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
