import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

interface Product {
  id: string
  name: string
  brand: string | null
}

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  product: Product
}

interface Order {
  id: string
  status: 'pending' | 'paid' | 'cancelled' | 'shipped' | 'completed'
  shipping_address_id: string
  subtotal: number
  discount: number
  shipping_fee: number
  grand_total: number
  coupon_code: string | null
  reserved_until: string | null
  created_at: string
  items: OrderItem[]
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/orders/')
      if (response.data.success) {
        setOrders(response.data.data)
      }
    } catch (err: any) {
      setError('Siparişler yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Bu siparişi iptal etmek istediğinize emin misiniz? Rezerve edilen ürünler serbest kalacaktır.')) return
    try {
      const response = await api.post(`/orders/${orderId}/cancel`)
      if (response.data.success) {
        alert('Siparişiniz başarıyla iptal edildi.')
        // Refresh orders list
        fetchOrders()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Sipariş iptal edilemedi.')
    }
  }

  // Localized badge helpers
  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xxs font-bold bg-amber-100 text-amber-800">
            Ödeme Bekliyor
          </span>
        )
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xxs font-bold bg-emerald-100 text-emerald-800">
            Ödendi
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xxs font-bold bg-red-100 text-red-800">
            İptal Edildi
          </span>
        )
      case 'shipped':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xxs font-bold bg-blue-100 text-blue-800">
            Kargoya Verildi
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xxs font-bold bg-slate-100 text-slate-800">
            Tamamlandı
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Siparişlerim</h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 shadow-xs">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-xs">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <h3 className="mt-4 text-base font-bold text-slate-900">Sipariş Kaydınız Bulunmuyor</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto">
            YapSat üzerinden henüz hiç sipariş vermediniz. Alışverişe başlayarak ilk siparişinizi oluşturun.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-xs transition"
            >
              Ürünleri İncele
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const formattedDate = new Date(order.created_at).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Order Header Info */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center">
                  <div className="space-y-1">
                    <span className="block text-xxs font-bold text-slate-400 uppercase">Sipariş Tarihi</span>
                    <span className="text-xs font-semibold text-slate-700">{formattedDate}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xxs font-bold text-slate-400 uppercase">Sipariş Numarası</span>
                    <span className="text-xs font-mono font-semibold text-slate-950 uppercase">{order.id.slice(0, 8)}...</span>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xxs font-bold text-slate-400 uppercase">Toplam Tutar</span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.grand_total)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xxs font-bold text-slate-400 uppercase">Durum</span>
                    <div>{getStatusBadge(order.status)}</div>
                  </div>

                  {/* Cancel Button */}
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xxs rounded-lg transition cursor-pointer"
                    >
                      Siparişi İptal Et
                    </button>
                  )}
                </div>

                {/* Order Items List */}
                <div className="p-6 divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex justify-between items-center gap-4">
                      <div>
                        {item.product.brand && (
                          <span className="text-xxs font-extrabold text-primary-600 uppercase tracking-wider">
                            {item.product.brand}
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-slate-950">{item.product.name}</h4>
                        <span className="text-xxs text-slate-400 block mt-0.5">Adet: {item.quantity}</span>
                      </div>

                      <span className="text-sm font-extrabold text-slate-900">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotals footer */}
                <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex justify-end text-xxs text-slate-500 gap-6">
                  <span>Ara Toplam: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.subtotal)}</span>
                  {order.discount > 0 && (
                    <span className="text-emerald-600">İndirim ({order.coupon_code}): -{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.discount)}</span>
                  )}
                  <span>Kargo: {order.shipping_fee === 0 ? 'Ücretsiz' : `${order.shipping_fee} TL`}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
