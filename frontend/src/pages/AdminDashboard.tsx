import { useEffect, useState } from 'react'
import api from '../services/api'
import AdminProducts from './AdminProducts'

interface CategorySale {
  category_name: string
  sales_amount: number
  quantity_sold: number
}

interface Stats {
  total_sales: number
  total_orders: number
  total_users: number
  total_products: number
  sales_by_category: CategorySale[]
}

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  product: {
    name: string
  }
}

interface Order {
  id: string
  status: 'pending' | 'paid' | 'cancelled' | 'shipped' | 'completed'
  subtotal: number
  discount: number
  shipping_fee: number
  grand_total: number
  coupon_code: string | null
  created_at: string
  user: {
    email: string
    first_name: string
    last_name: string
  }
  items: OrderItem[]
}

interface StoreApplication {
  id: string
  user_id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'products' | 'stores'>('stats')
  
  // Dashboard states
  const [stats, setStats] = useState<Stats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [storeApplications, setStoreApplications] = useState<StoreApplication[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [statusFilter])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch Stats
      const statsRes = await api.get('/admin/stats')
      if (statsRes.data.success) {
        setStats(statsRes.data.data)
      }

      // 2. Fetch Orders
      const url = statusFilter ? `/admin/orders?status_filter=${statusFilter}` : '/admin/orders'
      const ordersRes = await api.get(url)
      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data)
      }

      // 3. Fetch Store Applications
      const storesRes = await api.get('/stores/admin/applications')
      if (storesRes.data.success) {
        setStoreApplications(storesRes.data.data)
      }
    } catch (err: any) {
      setError('Yönetim verileri yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Handle store approval
  const handleApproveStore = async (storeId: string, is_active: boolean) => {
    try {
      const response = await api.put(`/stores/admin/${storeId}/approve`, { is_active })
      if (response.data.success) {
        await fetchDashboardData()
        alert(is_active ? 'Mağaza onaylandı ve satıcı yetkisi verildi.' : 'Mağaza pasifleştirildi.')
      }
    } catch (err: any) {
      alert('Mağaza durumu güncellenemedi.')
    }
  }

  // Handle manual status changes by administrator
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setStatusUpdatingId(orderId)
    try {
      const response = await api.put(`/admin/orders/${orderId}/status`, { status: newStatus })
      if (response.data.success) {
        // Refresh dashboard data to update total ciro and stock values
        await fetchDashboardData()
        alert('Sipariş durumu başarıyla güncellendi.')
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Sipariş durumu güncellenemedi.')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Yönetici Kontrol Paneli</h1>
          <p className="text-sm text-slate-500 mt-1">Sistem istatistiklerini, ürün kataloğunu ve sipariş durumlarını buradan yönetebilirsiniz.</p>
        </div>

        {/* Tab navigation */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl self-start md:self-auto border border-slate-200">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'stats' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            İstatistikler
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sipariş Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ürün Kataloğu
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'stores' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Mağaza Başvuruları
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 shadow-xs">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Tab CONTENT: Stats */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-8 animate-fadeIn">
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Revenue */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-slate-400 font-bold text-xxs uppercase tracking-wider">Toplam Satış</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.total_sales)}
              </span>
            </div>

            {/* Card 2: Orders Count */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-slate-400 font-bold text-xxs uppercase tracking-wider">Toplam Sipariş</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">{stats.total_orders}</span>
            </div>

            {/* Card 3: Products Count */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-slate-400 font-bold text-xxs uppercase tracking-wider">Aktif Ürün Sayısı</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">{stats.total_products}</span>
            </div>

            {/* Card 4: Users Count */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-slate-400 font-bold text-xxs uppercase tracking-wider">Kayıtlı Kullanıcı</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">{stats.total_users}</span>
            </div>
          </div>

          {/* Category Sales Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Kategori Bazlı Satış Analizi</h3>
            </div>
            
            {stats.sales_by_category.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">Kategori bazlı satış verisi bulunmuyor.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <th className="px-6 py-3">Kategori</th>
                      <th className="px-6 py-3 text-right">Satış Miktarı (Adet)</th>
                      <th className="px-6 py-3 text-right">Toplam Satış Ciro (TL)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.sales_by_category.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900">{cat.category_name}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-600">{cat.quantity_sold} adet</td>
                        <td className="px-6 py-4 text-right font-extrabold text-slate-950">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(cat.sales_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab CONTENT: Orders Management */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Order Status Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Tüm Siparişler', value: '' },
              { label: 'Ödeme Bekliyor', value: 'pending' },
              { label: 'Ödendi', value: 'paid' },
              { label: 'Kargoya Verildi', value: 'shipped' },
              { label: 'Tamamlandı', value: 'completed' },
              { label: 'İptal Edildi', value: 'cancelled' },
            ].map((filt) => (
              <button
                key={filt.value}
                onClick={() => setStatusFilter(filt.value)}
                className={`px-3 py-1.5 rounded-lg text-xxs font-bold transition border cursor-pointer ${
                  statusFilter === filt.value
                    ? 'bg-primary-600 border-primary-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                }`}
              >
                {filt.label}
              </button>
            ))}
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {orders.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-400">
                Filtreye uygun sipariş kaydı bulunamadı.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <th className="px-6 py-3">Sipariş ID</th>
                      <th className="px-6 py-3">Müşteri</th>
                      <th className="px-6 py-3">Tarih</th>
                      <th className="px-6 py-3">Sipariş İçeriği</th>
                      <th className="px-6 py-3 text-right">Toplam Tutar</th>
                      <th className="px-6 py-3 text-center">Durum Güncelle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => {
                      const formattedDate = new Date(order.created_at).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/50 align-middle">
                          <td className="px-6 py-4 font-mono font-bold text-slate-400">
                            {order.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4">
                            <span className="block font-bold text-slate-900">
                              {order.user.first_name} {order.user.last_name}
                            </span>
                            <span className="block text-xxs text-slate-500 mt-0.5">{order.user.email}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <span key={item.id} className="block truncate text-xxs text-slate-500">
                                  • {item.product.name} <strong className="text-slate-900">x{item.quantity}</strong>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-extrabold text-slate-950">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.grand_total)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <select
                              value={order.status}
                              disabled={statusUpdatingId === order.id}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xxs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                            >
                              <option value="pending">Ödeme Bekliyor</option>
                              <option value="paid">Ödendi</option>
                              <option value="shipped">Kargoya Verildi</option>
                              <option value="completed">Tamamlandı</option>
                              <option value="cancelled">İptal Edildi</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab CONTENT: Products Management (embedded AdminProducts) */}
      {activeTab === 'products' && (
        <div className="animate-fadeIn">
          <AdminProducts />
        </div>
      )}

      {/* Tab CONTENT: Store Applications */}
      {activeTab === 'stores' && (
        <div className="space-y-6 animate-fadeIn">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Mağaza Başvuruları</h3>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {storeApplications.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-400">Henüz mağaza başvurusu bulunmuyor.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <th className="px-6 py-3">Mağaza Adı</th>
                      <th className="px-6 py-3">Slug</th>
                      <th className="px-6 py-3">Açıklama</th>
                      <th className="px-6 py-3 text-center">Durum</th>
                      <th className="px-6 py-3 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {storeApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/50 align-middle">
                        <td className="px-6 py-4 font-bold text-slate-900">{app.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{app.slug}</td>
                        <td className="px-6 py-4 text-slate-600">{app.description || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xxs font-bold ${
                              app.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {app.is_active ? 'Aktif' : 'Onay Bekliyor'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {app.is_active ? (
                            <button
                              onClick={() => handleApproveStore(app.id, false)}
                              className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition cursor-pointer"
                            >
                              Kapat / Pasifleştir
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApproveStore(app.id, true)}
                              className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold rounded-lg transition cursor-pointer"
                            >
                              Başvuruyu Onayla
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
