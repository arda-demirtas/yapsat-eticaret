import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  images: ProductImage[]
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories/')
      if (response.data.success) {
        setCategories(response.data.data)
      }
    } catch (err: any) {
      console.error('Kategoriler yüklenemedi:', err)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      let url = '/products/?'
      if (selectedCategory) {
        url += `category_id=${selectedCategory}&`
      }
      if (searchQuery) {
        url += `search=${encodeURIComponent(searchQuery)}&`
      }
      
      const response = await api.get(url)
      if (response.data.success) {
        setProducts(response.data.data)
      }
      setError('')
    } catch (err: any) {
      setError('Ürünler yüklenirken bir hata oluştu.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts()
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    // We need to fetch products without search query immediately
    // Wait, setting state is async, so we pass empty string to manual fetch
    setTimeout(() => fetchProducts(), 0)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search and Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:text-3xl sm:truncate">
            Ürün Kataloğu
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            En yeni ve kaliteli ürünleri keşfedin.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-4 md:mt-0 flex gap-2 w-full md:max-w-md">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Ürün adı, marka veya SKU ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition cursor-pointer"
          >
            Ara
          </button>
        </form>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Category Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Kategoriler
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  selectedCategory === ''
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                Tüm Ürünler
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    selectedCategory === category.id
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-grow">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200 mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-xl border border-slate-200">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">Ürün Bulunamadı</h3>
              <p className="mt-1 text-sm text-slate-500">
                Arama kriterlerinize uygun aktif bir ürün bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((product) => {
                const hasImage = product.images && product.images.length > 0
                const imageUrl = hasImage ? product.images[0].url : 'https://placehold.co/400x400/e2e8f0/64748b?text=Urun+Gorseli'
                const isOutOfStock = product.stock === 0

                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col"
                  >
                    {/* Image Area */}
                    <div className="relative bg-slate-100 pt-[100%] overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      {isOutOfStock && (
                        <span className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                          Tükendi
                        </span>
                      )}
                      {product.brand && (
                        <span className="absolute bottom-3 left-3 bg-slate-900/75 text-white px-2 py-0.5 rounded text-xxs font-medium backdrop-blur-xs">
                          {product.brand}
                        </span>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {categories.find((c) => c.id === product.category_id)?.name || 'Genel'}
                        </h4>
                        <Link
                          to={`/products/${product.slug}`}
                          className="block mt-1 text-sm font-bold text-slate-900 hover:text-primary-600 line-clamp-2"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-1 text-xxs text-slate-400">SKU: {product.sku}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-base font-extrabold text-slate-900">
                          {new Intl.NumberFormat('tr-TR', {
                            style: 'currency',
                            currency: 'TRY'
                          }).format(product.price)}
                        </span>
                        
                        <Link
                          to={`/products/${product.slug}`}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-primary-600 hover:text-white rounded-lg text-xs font-semibold transition"
                        >
                          İncele
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
