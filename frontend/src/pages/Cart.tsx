import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

interface ProductImage {
  id: string
  url: string
  thumbnail_url: string
}

interface Product {
  id: string
  name: string
  slug: string
  sku: string
  price: number
  stock: number
  brand: string | null
  images: ProductImage[]
}

interface CartItem {
  id: string  // Database CartItem ID (UUID) or product ID if guest
  product_id: string
  quantity: number
  product: Product
}

interface Coupon {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  value: number
  min_purchase_amount: number
}

export default function Cart() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  // Coupon state
  const [couponCode, setCouponCode] = useState<string>('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState<string>('')
  const [couponSuccess, setCouponSuccess] = useState<string>('')

  useEffect(() => {
    fetchCart()
  }, [isAuthenticated])

  const fetchCart = async () => {
    setLoading(true)
    setError('')
    try {
      if (isAuthenticated) {
        // Authenticated Cart from Database
        const response = await api.get('/cart/')
        if (response.data.success) {
          setCartItems(response.data.data)
        }
      } else {
        // Guest Cart from localStorage
        const localCart = localStorage.getItem('guest_cart')
        const items = localCart ? JSON.parse(localCart) : []
        
        if (items.length > 0) {
          // Fetch product catalog to map product details
          const catalogRes = await api.get('/products/')
          if (catalogRes.data.success) {
            const allProducts: Product[] = catalogRes.data.data
            const mappedItems: CartItem[] = items.map((item: any) => {
              const matchedProduct = allProducts.find(p => p.id === item.product_id)
              return {
                id: item.product_id, // Use product_id as key for guests
                product_id: item.product_id,
                quantity: item.quantity,
                product: matchedProduct || {
                  id: item.product_id,
                  name: 'Bilinmeyen Ürün',
                  slug: '#',
                  sku: 'N/A',
                  price: 0,
                  stock: 0,
                  brand: null,
                  images: []
                }
              }
            })
            // Filter out items that couldn't be loaded
            setCartItems(mappedItems)
          }
        } else {
          setCartItems([])
        }
      }
    } catch (err: any) {
      setError('Sepet yüklenirken bir hata oluştu.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Update Item Quantity
  const handleUpdateQuantity = async (item: CartItem, newQty: number) => {
    if (newQty < 1) return
    if (newQty > item.product.stock) {
      alert(`Stok limiti aşılamaz. Bu üründen en fazla ${item.product.stock} adet ekleyebilirsiniz.`)
      return
    }

    try {
      if (isAuthenticated) {
        // Update database cart item
        const response = await api.put(`/cart/items/${item.id}`, { quantity: newQty })
        if (response.data.success) {
          setCartItems(cartItems.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
        }
      } else {
        // Update localStorage
        const localCart = localStorage.getItem('guest_cart')
        const items = localCart ? JSON.parse(localCart) : []
        const updatedItems = items.map((i: any) => i.product_id === item.product_id ? { ...i, quantity: newQty } : i)
        localStorage.setItem('guest_cart', JSON.stringify(updatedItems))
        setCartItems(cartItems.map(i => i.product_id === item.product_id ? { ...i, quantity: newQty } : i))
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Sepet güncellenemedi.')
    }
  }

  // Remove Item
  const handleRemoveItem = async (item: CartItem) => {
    if (!confirm('Bu ürünü sepetinizden kaldırmak istediğinize emin misiniz?')) return
    try {
      if (isAuthenticated) {
        // Delete from database
        const response = await api.delete(`/cart/items/${item.id}`)
        if (response.data.success) {
          setCartItems(cartItems.filter(i => i.id !== item.id))
        }
      } else {
        // Delete from localStorage
        const localCart = localStorage.getItem('guest_cart')
        const items = localCart ? JSON.parse(localCart) : []
        const filteredItems = items.filter((i: any) => i.product_id !== item.product_id)
        localStorage.setItem('guest_cart', JSON.stringify(filteredItems))
        setCartItems(cartItems.filter(i => i.product_id !== item.product_id))
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ürün sepetten silinemedi.')
    }
  }

  // Apply Coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponCode.trim()) return
    setCouponError('')
    setCouponSuccess('')
    
    try {
      const response = await api.get(`/coupons/validate?code=${encodeURIComponent(couponCode)}&cart_total=${subtotal}`)
      if (response.data.success) {
        const coupon: Coupon = response.data.data
        setAppliedCoupon(coupon)
        setCouponSuccess(`'${coupon.code}' kuponu başarıyla uygulandı!`)
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'Geçersiz kupon kodu.')
      setAppliedCoupon(null)
    }
  }

  // Clear Applied Coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponSuccess('')
    setCouponError('')
  }

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  
  let discount = 0
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discount = subtotal * (appliedCoupon.value / 100)
    } else {
      discount = Math.min(appliedCoupon.value, subtotal)
    }
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
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Alışveriş Sepetim</h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200 mb-6">
          {error}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-slate-200">
          <svg
            className="mx-auto h-16 w-16 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-bold text-slate-900">Sepetiniz Boş</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Sepetinizde henüz hiç ürün bulunmuyor. Alışverişe başlamak için ürünlerimize göz atın!
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-sm transition"
            >
              Alışverişe Başla
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const hasImage = item.product.images && item.product.images.length > 0
              const imageUrl = hasImage ? item.product.images[0].url : 'https://placehold.co/400x400/e2e8f0/64748b?text=Urun+Gorseli'

              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex gap-4 items-center"
                >
                  <img
                    src={imageUrl}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded-lg border border-slate-100 flex-shrink-0"
                  />

                  <div className="flex-grow min-w-0">
                    {item.product.brand && (
                      <span className="text-xxs font-bold text-primary-600 uppercase tracking-wider">
                        {item.product.brand}
                      </span>
                    )}
                    <Link
                      to={`/products/${item.product.slug}`}
                      className="block text-sm font-bold text-slate-900 hover:text-primary-600 truncate"
                    >
                      {item.product.name}
                    </Link>
                    <span className="block text-xxs text-slate-400 mt-0.5">SKU: {item.product.sku}</span>
                    
                    <span className="block mt-1.5 font-extrabold text-slate-950 text-sm">
                      {new Intl.NumberFormat('tr-TR', {
                        style: 'currency',
                        currency: 'TRY'
                      }).format(item.product.price)}
                    </span>
                  </div>

                  {/* Quantity Actions */}
                  <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 flex-shrink-0">
                    <button
                      onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-700 cursor-pointer font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-700 cursor-pointer font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleRemoveItem(item)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer flex-shrink-0"
                    title="Ürünü Sil"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Cart Summary Side */}
          <div className="space-y-6">
            {/* Coupon Application Block */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                İndirim Kuponu
              </h3>
              
              {!appliedCoupon ? (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Kupon Kodu Girin"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-grow px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-primary-500 focus:outline-none uppercase"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Uygula
                  </button>
                </form>
              ) : (
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 font-mono">{appliedCoupon.code}</span>
                    <span className="block text-xxs text-emerald-600">
                      {appliedCoupon.discount_type === 'percentage'
                        ? `%${appliedCoupon.value} İndirim`
                        : `${appliedCoupon.value} TL İndirim`}
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-emerald-700 hover:text-red-600 text-xs font-bold cursor-pointer"
                  >
                    Kaldır
                  </button>
                </div>
              )}

              {couponError && <p className="text-xs text-red-600 mt-2">{couponError}</p>}
              {couponSuccess && <p className="text-xs text-emerald-600 mt-2">{couponSuccess}</p>}
            </div>

            {/* Price Calculations Summary */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
                Sipariş Özeti
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Sepet Alt Toplamı</span>
                  <span>
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(subtotal)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Kupon İndirimi</span>
                    <span>
                      -
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(discount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Kargo Ücreti</span>
                  {shippingFee === 0 ? (
                    <span className="text-emerald-600 font-semibold">Ücretsiz</span>
                  ) : (
                    <span>
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(shippingFee)}
                    </span>
                  )}
                </div>

                {!isFreeShipping && cartItems.length > 0 && (
                  <p className="text-xxs text-slate-400 mt-1 bg-slate-50 p-2 rounded">
                    💡 <strong>{100 - netTotal} TL</strong> daha alışveriş yaparak kargoyu ücretsiz hale getirebilirsiniz!
                  </p>
                )}
              </div>

              <hr className="border-slate-100" />

              <div className="flex justify-between text-base font-extrabold text-slate-900">
                <span>Genel Toplam</span>
                <span>
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(grandTotal)}
                </span>
              </div>

              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    alert('Sipariş oluşturmak için lütfen önce giriş yapın.')
                    navigate('/login')
                  } else {
                    navigate('/checkout', { state: { couponCode: appliedCoupon?.code } })
                  }
                }}
                className="w-full mt-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-sm text-center transition cursor-pointer"
              >
                Alışverişi Tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
