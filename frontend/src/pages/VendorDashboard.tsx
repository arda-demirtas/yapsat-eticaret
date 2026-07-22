import React, { useEffect, useState } from 'react'
import api from '../services/api'

interface Category {
  id: string
  name: string
  slug: string
}

interface ProductImage {
  id: string
  url: string
  thumbnail_url: string
}

interface Product {
  id: string
  category_id: string | null
  name: string
  slug: string
  sku: string
  description: string | null
  price: number
  brand: string | null
  stock: number
  is_archived: boolean
  seo_title: string | null
  seo_description: string | null
  images: ProductImage[]
}

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  product: {
    name: string
    store_id: string
  }
}

interface Order {
  id: string
  status: string
  subtotal: number
  discount: number
  shipping_fee: number
  grand_total: number
  created_at: string
  user: {
    email: string
    first_name: string
    last_name: string
  }
  items: OrderItem[]
}

interface Stats {
  store_name: string
  total_sales: number
  total_orders: number
  total_products: number
}

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<'stats' | 'products' | 'orders'>('stats')
  
  // Scoped Vendor Data
  const [stats, setStats] = useState<Stats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Product modal form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [stock, setStock] = useState<number | ''>('')
  const [categoryId, setCategoryId] = useState('')
  const [brand, setBrand] = useState('')
  const [description, setDescription] = useState('')
  const [isArchived, setIsArchived] = useState(false)
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isHandmade, setIsHandmade] = useState(false)

  const [formError, setFormError] = useState('')
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, prodRes, catRes, ordRes] = await Promise.all([
        api.get('/vendor/stats'),
        api.get('/vendor/products'),
        api.get('/categories/'),
        api.get('/vendor/orders')
      ])

      if (statsRes.data.success) setStats(statsRes.data.data)
      if (prodRes.data.success) setProducts(prodRes.data.data)
      if (catRes.data.success) setCategories(catRes.data.data)
      if (ordRes.data.success) setOrders(ordRes.data.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Mağaza verileri yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setName('')
    setSku('')
    setPrice('')
    setStock('')
    setCategoryId('')
    setBrand('')
    setDescription('')
    setIsArchived(false)
    setSeoTitle('')
    setSeoDescription('')
    setSelectedFiles([])
    setImagePreviews([])
    setIsHandmade(false)
    setFormError('')
    setUploadError('')
    setIsModalOpen(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const filesArray = Array.from(files)
    setSelectedFiles(prev => [...prev, ...filesArray])
    const previewsArray = filesArray.map(file => URL.createObjectURL(file))
    setImagePreviews(prev => [...prev, ...previewsArray])
  }

  const handleRemoveSelectedFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setName(p.name)
    setSku(p.sku)
    setPrice(p.price)
    setStock(p.stock)
    setCategoryId(p.category_id || '')
    setBrand(p.brand || '')
    setDescription(p.description || '')
    setIsArchived(p.is_archived)
    setSeoTitle(p.seo_title || '')
    setSeoDescription(p.seo_description || '')
    setIsHandmade(p.brand === 'El Yapımı')
    setFormError('')
    setUploadError('')
    setIsModalOpen(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setActionLoading(true)

    const payload = {
      name,
      sku: sku ? sku : null,
      price: price === '' ? 0 : price,
      stock: stock === '' ? 0 : stock,
      category_id: categoryId ? categoryId : null,
      brand: brand ? brand : null,
      description: description ? description : null,
      is_archived: isArchived,
      seo_title: seoTitle ? seoTitle : null,
      seo_description: seoDescription ? seoDescription : null
    }

    try {
      if (editingProduct) {
        const res = await api.put(`/vendor/products/${editingProduct.id}`, payload)
        if (res.data.success) {
          await fetchDashboardData()
          setIsModalOpen(false)
        }
      } else {
        const res = await api.post('/vendor/products', payload)
        if (res.data.success) {
          const createdProduct = res.data.data
          
          // Upload selected images if any
          if (selectedFiles.length > 0) {
            for (const file of selectedFiles) {
              const formData = new FormData()
              formData.append('file', file)
              try {
                await api.post(`/vendor/products/${createdProduct.id}/images`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                })
              } catch (err) {
                console.error('Görsel yükleme hatası:', err)
              }
            }
          }
          
          await fetchDashboardData()
          setIsModalOpen(false)
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Ürün kaydedilemedi.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    setActionLoading(true)
    try {
      const res = await api.delete(`/vendor/products/${id}`)
      if (res.data.success) {
        await fetchDashboardData()
        alert('Ürün başarıyla silindi.')
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ürün silinemedi.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingProduct) return

    setUploadError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post(`/vendor/products/${editingProduct.id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data.success) {
        const newImg = res.data.data
        const updatedImages = [...(editingProduct.images || []), newImg]
        const updatedProduct = { ...editingProduct, images: updatedImages }
        setEditingProduct(updatedProduct)
        setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p))
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Resim yüklenemedi. (Maks 10MB, JPG/PNG/WEBP)')
    }
  }

  const handleImageDelete = async (imageId: string) => {
    if (!confirm('Bu görseli silmek istediğinizden emin misiniz?')) return
    try {
      const res = await api.delete(`/vendor/products/images/${imageId}`)
      if (res.data.success && editingProduct) {
        const updatedImages = editingProduct.images.filter(img => img.id !== imageId)
        const updatedProduct = { ...editingProduct, images: updatedImages }
        setEditingProduct(updatedProduct)
        setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p))
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Görsel silinemedi.')
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
      {/* Title & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats?.store_name || 'Satıcı'} Paneli
          </h1>
          <p className="text-sm text-slate-500 mt-1">Mağazanıza ait envanter, sipariş ve satış istatistiklerini yönetin.</p>
        </div>

        <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'stats' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Özet Raporlar
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ürünlerim ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Siparişler ({orders.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 shadow-xs">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Tab: Stats */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-slate-400 font-bold text-xxs uppercase tracking-wider">Mağaza Satış Tutarı</span>
            <span className="text-2xl font-black text-slate-900 mt-2 block">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.total_sales)}
            </span>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-slate-400 font-bold text-xxs uppercase tracking-wider">Gelen Sipariş</span>
            <span className="text-2xl font-black text-slate-900 mt-2 block">{stats.total_orders} adet</span>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-slate-400 font-bold text-xxs uppercase tracking-wider">Toplam Ürün Adedi</span>
            <span className="text-2xl font-black text-slate-900 mt-2 block">{stats.total_products} model</span>
          </div>
        </div>
      )}

      {/* Tab: Products */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Ürün Envanteri</h3>
            <button
              onClick={openAddModal}
              className="py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Yeni Ürün Ekle
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {products.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-400">Henüz ürün listelemediniz.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <th className="px-6 py-3">Ürün</th>
                      <th className="px-6 py-3">SKU</th>
                      <th className="px-6 py-3 text-right">Fiyat</th>
                      <th className="px-6 py-3 text-right">Stok</th>
                      <th className="px-6 py-3 text-center">Durum</th>
                      <th className="px-6 py-3 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 align-middle">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <img
                            src={p.images?.[0]?.thumbnail_url || 'https://placehold.co/100x100?text=Yapsat'}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-100 bg-slate-50"
                            alt=""
                          />
                          <span className="font-bold text-slate-900">{p.name}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-400">{p.sku}</td>
                        <td className="px-6 py-4 text-right font-extrabold text-slate-950">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(p.price)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-600">{p.stock} adet</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xxs font-bold ${
                              p.is_archived
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {p.is_archived ? 'Arşivde' : 'Aktif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition cursor-pointer"
                          >
                            Sil
                          </button>
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

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fadeIn">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Mağaza Siparişleri</h3>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {orders.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-400">Ürünlerinize ait bir sipariş bulunmuyor.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <th className="px-6 py-3">Sipariş ID</th>
                      <th className="px-6 py-3">Müşteri</th>
                      <th className="px-6 py-3">Tarih</th>
                      <th className="px-6 py-3">Mağazanızdan Alınan Ürünler</th>
                      <th className="px-6 py-3 text-right">Mağaza Hakediş</th>
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

                      // Calculate ciro of items belonging to this vendor
                      const vendorTotal = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

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
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <span key={item.id} className="block text-xxs text-slate-500 truncate">
                                  • {item.product.name} <strong className="text-slate-900">x{item.quantity}</strong>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-extrabold text-emerald-600">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(vendorTotal)}
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

      {/* Modal: Add/Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Kapat
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-lg border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1.5">Ürün Adı</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-primary-500 rounded-lg text-xs focus:outline-none transition"
                />
              </div>

              {/* SKU (Only displayed when editing, as disabled) */}
              {editingProduct && (
                <div>
                  <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1.5">Stok Kodu (SKU)</label>
                  <input
                    type="text"
                    disabled
                    value={sku}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg text-xs focus:outline-none cursor-not-allowed"
                  />
                </div>
              )}

              <div>
                <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1.5">Fiyat (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-primary-500 rounded-lg text-xs focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1.5">Stok Adedi</label>
                <input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-primary-500 rounded-lg text-xs focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1.5">Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-primary-500 rounded-lg text-xs focus:outline-none transition"
                >
                  <option value="">Seçiniz</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand and Handmade Checkbox */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Marka</label>
                  <label className="flex items-center gap-1.5 text-xxs text-slate-600 font-bold select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHandmade}
                      onChange={(e) => {
                        setIsHandmade(e.target.checked)
                        if (e.target.checked) {
                          setBrand('El Yapımı')
                        } else {
                          setBrand('')
                        }
                      }}
                      className="h-3.5 w-3.5 text-primary-600 border-slate-300 rounded"
                    />
                    <span>El Yapımı</span>
                  </label>
                </div>
                <input
                  type="text"
                  disabled={isHandmade}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none transition-all ${
                    isHandmade ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 bg-slate-50 focus:border-primary-500'
                  }`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1.5">Açıklama</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-primary-500 rounded-lg text-xs focus:outline-none transition resize-none"
                />
              </div>



              {/* Direct Image Picker during creation */}
              {!editingProduct && (
                <div className="md:col-span-2 border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 mt-2">
                  <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-2">Ürün Görselleri Seçin</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                  />
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
                      {imagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative pt-[100%] rounded-lg border border-slate-200 overflow-hidden bg-slate-50 group animate-fadeIn">
                          <img src={preview} className="absolute inset-0 w-full h-full object-cover" alt="" />
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedFile(idx)}
                            className="absolute inset-0 bg-red-600/80 text-white text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer"
                          >
                            Kaldır
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isArchived"
                  checked={isArchived}
                  onChange={(e) => setIsArchived(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isArchived" className="text-xs font-bold text-slate-700">
                  Bu ürünü arşivle (katalogda sergileme)
                </label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>

            {/* Images list (only available for existing products) */}
            {editingProduct && (
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Ürün Görselleri</h4>
                  <label className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xxs transition cursor-pointer">
                    Resim Ekle
                    <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </label>
                </div>

                {uploadError && (
                  <p className="text-xxs font-bold text-red-600">{uploadError}</p>
                )}

                {editingProduct.images?.length === 0 ? (
                  <p className="text-xxs text-slate-400">Bu ürüne ait henüz görsel yüklenmedi.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {editingProduct.images?.map((img) => (
                      <div key={img.id} className="relative group border border-slate-100 rounded-lg overflow-hidden bg-slate-50 aspect-square">
                        <img src={img.thumbnail_url} className="w-full h-full object-cover" alt="" />
                        <button
                          onClick={() => handleImageDelete(img.id)}
                          className="absolute inset-0 bg-red-600/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xxs transition-all cursor-pointer"
                        >
                          Sil
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Button Panel */}
      <div className="mt-12 border-t border-slate-200 pt-6">
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Yardım ve Mağaza Bilgisi</h4>
              <p className="text-xs text-slate-500 mt-0.5">Mağaza ürün kataloğu, sipariş hakedişleri ve stok güncellemeleri hakkında yönergeleri görün.</p>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            {showInfo ? 'Kapat' : 'Bilgi Al'}
          </button>
        </div>

        {showInfo && (
          <div className="mt-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4 animate-fadeIn">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Mağaza Satış Direktifleri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="space-y-2">
                <p>
                  <strong className="text-slate-900">1. Mağaza Stok Kodu:</strong> Satışa sunduğunuz her ürün modeli için benzersiz Stok Kodu (SKU) belirleyin. Fiyat ve stok alanları ilk açılışta sıfır yerine boş gelecektir.
                </p>
                <p>
                  <strong className="text-slate-900">2. Görsel Yönetimi:</strong> Yeni ürün ekledikten sonra "Düzenle" butonuna tıklayarak ürününüze en fazla 10MB boyutunda fotoğraflar yükleyebilirsiniz.
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <strong className="text-slate-900">3. Sipariş Hakedişi:</strong> Müşteriler mağaza ürünlerinizi satın aldıklarında sipariş bilgileri "Siparişler" tabında listelenir ve mağaza hakedişiniz otomatik olarak yansıtılır.
                </p>
                <p>
                  <strong className="text-slate-900">4. SEO Başlığı ve Açıklaması:</strong> Google aramalarında ürününüzün daha kolay bulunması için en alttaki SEO alanlarını doldurmanız yararınıza olacaktır.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
