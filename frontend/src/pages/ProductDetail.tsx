import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

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

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { isAuthenticated } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [quantity, setQuantity] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  const handleNextImage = () => {
    if (!product || !product.images || product.images.length === 0) return
    setActiveImageIndex((prev) => (prev + 1) % product.images.length)
  }

  const handlePrevImage = () => {
    if (!product || !product.images || product.images.length === 0) return
    setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length)
  }

  const handleAddToCart = async () => {
    if (!product) return

    try {
      if (isAuthenticated) {
        const response = await api.post('/cart/add', {
          product_id: product.id,
          quantity: quantity
        })
        if (response.data.success) {
          alert('Ürün sepetinize eklendi!')
        }
      } else {
        const localCart = localStorage.getItem('guest_cart')
        const items = localCart ? JSON.parse(localCart) : []
        const existing = items.find((i: any) => i.product_id === product.id)
        
        if (existing) {
          const newQty = existing.quantity + quantity
          if (newQty > product.stock) {
            alert(`Stok limiti aşılamaz. Sepetinizde zaten ${existing.quantity} adet var, stokta ise sadece ${product.stock} adet bulunuyor.`)
            return
          }
          existing.quantity = newQty
        } else {
          items.push({ product_id: product.id, quantity: quantity })
        }
        
        localStorage.setItem('guest_cart', JSON.stringify(items))
        alert('Ürün sepetinize eklendi (Misafir Sepeti)!')
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Sepete eklenirken bir hata oluştu.')
    }
  }

  useEffect(() => {
    if (slug) {
      fetchProductDetail()
    }
  }, [slug])

  const fetchProductDetail = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/products/by-slug/${slug}`)
      if (response.data.success) {
        const prod = response.data.data
        setProduct(prod)
        setActiveImageIndex(0)
        
        // Update document title for SEO friendly simulation
        if (prod.seo_title) {
          document.title = prod.seo_title
        } else {
          document.title = `${prod.name} - YapSat`
        }
      } else {
        setError('Ürün bilgisi yüklenemedi.')
      }
    } catch (err: any) {
      setError('Ürün yüklenirken bir hata oluştu veya ürün bulunamadı.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg inline-block text-sm border border-red-200 mb-6">
          {error || 'Ürün bulunamadı.'}
        </div>
        <div>
          <Link to="/" className="text-primary-600 font-semibold hover:underline">
            Kataloğa Geri Dön
          </Link>
        </div>
      </div>
    )
  }

  const isOutOfStock = product.stock === 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <Link to="/" className="text-slate-500 hover:text-slate-700 text-sm font-medium">
          Katalog
        </Link>
        <span className="mx-2 text-slate-400">/</span>
        <span className="text-slate-900 text-sm font-semibold">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
        {/* Left Side: Product Gallery */}
        <div>
          <div className="bg-slate-100 rounded-xl overflow-hidden pt-[100%] relative group shadow-inner">
            <img
              src={product.images && product.images.length > 0 ? product.images[activeImageIndex]?.url : 'https://placehold.co/600x600/e2e8f0/64748b?text=Urun+Gorseli'}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
            />

            {/* Left Navigation Arrow */}
            {product.images && product.images.length > 1 && (
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-md text-slate-700 hover:text-slate-900 transition-all border border-slate-200/80 z-10 cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Right Navigation Arrow */}
            {product.images && product.images.length > 1 && (
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-md text-slate-700 hover:text-slate-900 transition-all border border-slate-200/80 z-10 cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Indicator Dots */}
            {product.images && product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                {product.images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-2 w-2 rounded-full transition-all cursor-pointer ${
                      activeImageIndex === idx ? 'bg-primary-600 w-4' : 'bg-white/70 hover:bg-white'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-3 mt-4">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`pt-[100%] relative rounded-lg border overflow-hidden cursor-pointer transition ${
                    activeImageIndex === idx ? 'border-primary-500 ring-2 ring-primary-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={img.thumbnail_url}
                    alt="Thumbnail"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Details Info */}
        <div className="flex flex-col justify-between">
          <div>
            {product.brand && (
              <span className="text-xs font-bold text-primary-600 uppercase tracking-widest bg-primary-50 px-2.5 py-1 rounded-md">
                {product.brand}
              </span>
            )}
            <h1 className="text-3xl font-extrabold text-slate-900 mt-4 leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-slate-400">SKU: {product.sku}</span>
              <span className="h-4 w-px bg-slate-200"></span>
              <span className={`text-xs font-bold uppercase tracking-wider ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
                {isOutOfStock ? 'Stokta Yok' : `Stokta Var (${product.stock} adet)`}
              </span>
            </div>

            {/* Price display */}
            <div className="mt-6 border-y border-slate-100 py-4">
              <span className="text-3xl font-black text-slate-900">
                {new Intl.NumberFormat('tr-TR', {
                  style: 'currency',
                  currency: 'TRY'
                }).format(product.price)}
              </span>
            </div>

            {/* Product Description */}
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Ürün Açıklaması</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {product.description || 'Bu ürün için henüz bir açıklama eklenmemiş.'}
              </p>
            </div>
          </div>

          {/* Add to Cart Actions (UI Only for now) */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            {!isOutOfStock ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-slate-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-3 py-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="flex-grow py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-sm transition cursor-pointer text-center"
                >
                  Sepete Ekle
                </button>
              </div>
            ) : (
              <button
                disabled
                className="w-full py-3 bg-slate-200 text-slate-400 font-bold rounded-lg text-sm cursor-not-allowed text-center"
              >
                Tükendi - Sepete Eklenemez
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
