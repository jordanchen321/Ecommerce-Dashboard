"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import ProductForm from "@/components/ProductForm"
import ProductTable from "@/components/ProductTable"
import SearchBar from "@/components/SearchBar"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { useLanguage } from "@/contexts/LanguageContext"

export interface Product {
  id: string
  name: string
  price: number
  productId: string
  quantity: number
}

export default function Home() {
  const { data: session, status } = useSession()
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)

  // Load products from API when user signs in
  useEffect(() => {
    if (!session?.user?.email) {
      // Clear products when session is null (signed out)
      setProducts([])
      setFilteredProducts([])
      setSearchTerm("")
      setIsLoaded(false)
      return
    }

    // Fetch products from API
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products')
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data.products)) {
            setProducts(data.products)
            setFilteredProducts(data.products)
          } else {
            setProducts([])
            setFilteredProducts([])
          }
        } else {
          // If unauthorized or error, start with empty array
          setProducts([])
          setFilteredProducts([])
        }
        setIsLoaded(true)
      } catch (error) {
        console.error('Error loading products:', error)
        setProducts([])
        setFilteredProducts([])
        setIsLoaded(true)
      }
    }

    fetchProducts()
  }, [session?.user?.email])

  // Save products to API whenever products change (tied to user email)
  // Only save after initial data is loaded to prevent overwriting with empty array
  useEffect(() => {
    if (!session?.user?.email || !isLoaded) return

    // Debounce API calls - wait a bit before saving to avoid too many requests
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ products }),
        })
        
        if (!response.ok) {
          console.error('Failed to save products to server')
        }
      } catch (error) {
        console.error('Error saving products:', error)
      }
    }, 500) // Wait 500ms after last change before saving

    return () => clearTimeout(timeoutId)
  }, [products, session?.user?.email, isLoaded])

  // Filter products based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter((product) =>
        product.productId.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }, [searchTerm, products])

  const handleAddProduct = (product: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
    }
    setProducts([...products, newProduct])
  }

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter((product) => product.id !== id))
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-xl text-gray-600">{t('loading')}</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            {t('signin.title')}
          </h1>
          <p className="text-gray-600 mb-6 text-center">
            {t('signin.subtitle')}
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: '/' })}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('signin.button')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-0 sm:h-16 gap-3 sm:gap-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{t('app.title')}</h1>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <LanguageSwitcher />
              <div className="flex items-center gap-2 sm:gap-3">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                  />
                )}
                <span className="hidden sm:inline text-gray-700 font-medium text-sm sm:text-base">
                  {session.user?.name || session.user?.email}
                </span>
              </div>
              <button
                onClick={() => {
                  signOut({ callbackUrl: '/' })
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition duration-200 text-sm sm:text-base whitespace-nowrap"
              >
                {t('nav.signOut')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:sticky lg:top-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
                {t('form.title')}
              </h2>
              <ProductForm onAdd={handleAddProduct} />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                  {t('table.title')} ({filteredProducts.length})
                </h2>
                <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
              </div>
              {filteredProducts.length > 0 ? (
                <ProductTable
                  products={filteredProducts}
                  onRemove={handleRemoveProduct}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? (
                    <p>{t('search.noResults').replace('{term}', searchTerm)}</p>
                  ) : (
                    <p>{t('empty.noProducts')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
