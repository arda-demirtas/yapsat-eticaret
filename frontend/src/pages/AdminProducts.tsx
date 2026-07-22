import { useEffect, useState } from 'react'
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

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)

  // Category state
  const [newCatName, setNewCatName] = useState<string>('')
  const [catError, setCatError] = useState<string>('')

  // Product modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Product Form state
  const [name, setName] = useState<string>('')
  const [sku, setSku] = useState<string>('')
  const [price, setPrice] = useState<number | ''>('')
  const [stock, setStock] = useState<number | ''>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [brand, setBrand] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [isArchived, setIsArchived] = useState<boolean>(false)
  const [seoTitle, setSeoTitle] = useState<string>('')
  const [seoDescription, setSeoDescription] = useState<string>('')
  const [showInfo, setShowInfo] = useState<boolean>(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isHandmade, setIsHandmade] = useState<boolean>(false)
  
  const [formError, setFormError] = useState<string>('')
  const [uploadError, setUploadError] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products/?show_archived=true'),
        api.get('/categories/')
      ])
      if (prodRes.data.success) setProducts(prodRes.data.data)
      if (catRes.data.success) setCategories(catRes.data.data)
    } catch (err: any) {
      console.error('Veri yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    setCatError('')
    try {
      const response = await api.post('/categories/', { name: newCatName })
      if (response.data.success) {
        setCategories([...categories, response.data.data])
        setNewCatName('')
      }
    } catch (err: any) {
      setCatError(err.response?.data?.message || 'Kategori eklenemedi.')
    }
  }

  // Edit product trigger
  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setSku(product.sku)
    setPrice(product.price)
    setStock(product.stock)
    setCategoryId(product.category_id || '')
    setBrand(product.brand || '')
    setDescription(product.description || '')
    setIsArchived(product.is_archived)
    setSeoTitle(product.seo_title || '')
    setSeoDescription(product.seo_description || '')
    setIsHandmade(product.brand === 'El Yapımı')
    
    setFormError('')
    setUploadError('')
    setIsModalOpen(true)
  }

  // Add product trigger
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

  // Save product (Insert or Update)
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
        // Edit Product
        const response = await api.put(`/products/${editingProduct.id}`, payload)
        if (response.data.success) {
          // Re-fetch data
          await fetchData()
          setIsModalOpen(false)
        }
      } else {
        // Add Product
        const response = await api.post('/products/', payload)
        if (response.data.success) {
          const createdProduct = response.data.data
          
          // Upload selected images if any
          if (selectedFiles.length > 0) {
            for (const file of selectedFiles) {
              const formData = new FormData()
              formData.append('file', file)
              try {
                await api.post(`/products/${createdProduct.id}/images`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                })
              } catch (err) {
                console.error('Görsel yükleme hatası:', err)
              }
            }
          }
          
          await fetchData()
          setIsModalOpen(false)
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Ürün kaydedilemedi.')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz (Soft delete)?')) return
    try {
      const response = await api.delete(`/products/${productId}`)
      if (response.data.success) {
        setProducts(products.filter(p => p.id !== productId))
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ürün silinemedi.')
    }
  }

  // Upload image to product
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !editingProduct) return
    setUploadError('')
    
    const formData = new FormData()
    formData.append('file', files[0])

    try {
      const response = await api.post(`/products/${editingProduct.id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (response.data.success) {
        // Add new image locally
        const newImg = response.data.data
        const updatedImages = [...(editingProduct.images || []), newImg]
        const updatedProduct = { ...editingProduct, images: updatedImages }
        setEditingProduct(updatedProduct)
        setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p))
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Resim yüklenemedi. (Maks 10MB, JPG/PNG/WEBP)')
    }
  }

  // Delete image from product
  const handleImageDelete = async (imageId: string) => {
    if (!confirm('Bu görseli silmek istediğinizden emin misiniz?')) return
    try {
      const response = await api.delete(`/products/images/${imageId}`)
      if (response.data.success && editingProduct) {
        const updatedImages = editingProduct.images.filter(img => img.id !== imageId)
        const updatedProduct = { ...editingProduct, images: updatedImages }
        setEditingProduct(updatedProduct)
        setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p))
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Görsel silinemedi.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Admin Yönetim Paneli</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Management Side */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs h-fit">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Kategori Yönetimi</h2>
          
          <form onSubmit={handleCreateCategory} className="mb-6 flex gap-2">
            <div className="flex-grow">
              <input
                type="text"
                placeholder="Yeni Kategori Adı"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer"
            >
              Ekle
            </button>
          </form>

          {catError && <p className="text-xs text-red-600 mb-4">{catError}</p>}

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {categories.map((category) => (
              <div key={category.id} className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-slate-800">{category.name}</span>
                  <span className="block text-xxs text-slate-400">/{category.slug}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Management Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">Ürün Listesi</h2>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition cursor-pointer"
            >
              + Yeni Ürün Ekle
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                    <th className="py-3 px-4">Ürün</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Fiyat</th>
                    <th className="py-3 px-4">Stok</th>
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                        {product.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{product.sku}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-950">
                        {new Intl.NumberFormat('tr-TR', {
                          style: 'currency',
                          currency: 'TRY'
                        }).format(product.price)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            product.stock === 0 ? 'text-red-600' : 'text-slate-700'
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {product.is_archived ? (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xxs font-bold uppercase">
                            Arşivli
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xxs font-bold uppercase">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-800"
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

      {/* Product Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingProduct ? `${editingProduct.name} Düzenle` : 'Yeni Ürün Oluştur'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6">
              {formError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-200 mb-4">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ürün Adı *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                 {/* SKU (Only displayed when editing, as disabled) */}
                 {editingProduct && (
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stok Kodu (SKU)</label>
                     <input
                       type="text"
                       disabled
                       value={sku}
                       className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-400 rounded-lg text-sm focus:outline-none cursor-not-allowed"
                     />
                   </div>
                 )}

                {/* Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fiyat (TL) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Stok Miktarı *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary-500 focus:outline-none bg-white"
                  >
                    <option value="">Kategori Seçin</option>
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
                     <label className="block text-xs font-bold text-slate-700 uppercase">Marka</label>
                     <label className="flex items-center gap-1.5 text-xs text-slate-600 font-bold select-none cursor-pointer">
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
                     className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-primary-500 focus:outline-none transition-all ${
                       isHandmade ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-300 bg-white'
                     }`}
                   />
                 </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Açıklama</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Status / Archive */}
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_archived"
                  checked={isArchived}
                  onChange={(e) => setIsArchived(e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-slate-300 rounded"
                />
                <label htmlFor="is_archived" className="text-xs font-bold text-slate-700 uppercase select-none">
                  Bu Ürünü Arşivle (Katalogda gizle)
                </label>
              </div>

              {/* Direct Image Picker during creation */}
              {!editingProduct && (
                <div className="mt-4 border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Ürün Görselleri Seçin</label>
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

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>

            {/* Media Upload Area (Available ONLY when editing existing product) */}
            {editingProduct && (
              <div className="px-6 pb-6 border-t border-slate-100 pt-6">
                <h4 className="font-bold text-slate-800 text-sm mb-3">Görsel Yönetimi</h4>
                
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    id="img-upload-input"
                    className="hidden"
                  />
                  <label
                    htmlFor="img-upload-input"
                    className="px-4 py-2 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition"
                  >
                    Görsel Seç ve Yükle
                  </label>
                  <span className="text-xxs text-slate-400">Maksimum 10MB boyutta JPG, PNG veya WEBP.</span>
                </div>

                {uploadError && <p className="text-xs text-red-600 mb-4">{uploadError}</p>}

                {/* Image Thumbnails Gallery */}
                <div className="grid grid-cols-6 gap-3">
                  {editingProduct.images && editingProduct.images.map((img) => (
                    <div key={img.id} className="relative pt-[100%] rounded-lg border border-slate-200 overflow-hidden bg-slate-50 group">
                      <img
                        src={img.thumbnail_url}
                        alt="Thumbnail"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageDelete(img.id)}
                        className="absolute inset-0 bg-red-600/80 text-white text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer"
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                </div>
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
              <h4 className="text-sm font-bold text-slate-900">Yardım ve Sayfa Bilgisi</h4>
              <p className="text-xs text-slate-500 mt-0.5">Ürün kataloğu yönetimi, SKU standartları ve SEO detayları için direktifleri görün.</p>
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
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Ürün Yönetim Direktifleri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="space-y-2">
                <p>
                  <strong className="text-slate-900">1. Stok Takibi (SKU):</strong> Her ürün için benzersiz bir Stok Kodu (SKU) tanımlanmalıdır. Örn: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">LPT-001</code>.
                </p>
                <p>
                  <strong className="text-slate-900">2. Fiyat ve Stok Değerleri:</strong> Fiyat alanı TL cinsindendir ve kuruş hanesi için nokta kullanılabilir. Fiyat ve stok alanları ilk açılışta boş gelecektir, geçerli bir sayı girilmelidir.
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <strong className="text-slate-900">3. SEO Optimizasyonu:</strong> Arama motorlarında öne çıkması amacıyla her ürüne özel SEO Başlığı (maks 255 karakter) ve SEO Açıklaması (maks 550 karakter) eklenmesi tavsiye edilir.
                </p>
                <p>
                  <strong className="text-slate-900">4. Resim Ekleme:</strong> Ürün kaydedildikten sonra Düzenle ekranı üzerinden ürün resimleri yüklenebilir. Resim boyutu maksimum 10MB olabilir.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
