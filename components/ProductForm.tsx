"use client"

import { useState, FormEvent } from "react"
import type { Product } from "@/app/page"
import { useLanguage } from "@/contexts/LanguageContext"

interface ProductFormProps {
  onAdd: (product: Omit<Product, "id">) => void
}

export default function ProductForm({ onAdd }: ProductFormProps) {
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!name || !price || !productId || !quantity) {
      alert(t('form.error.allFields'))
      return
    }

    const priceNum = parseFloat(price)
    const quantityNum = parseInt(quantity)

    if (isNaN(priceNum) || priceNum <= 0) {
      alert(t('form.error.validPrice'))
      return
    }

    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert(t('form.error.validQuantity'))
      return
    }

    onAdd({
      name,
      price: priceNum,
      productId,
      quantity: quantityNum,
      image: imagePreview || imageUrl || undefined,
    })

    // Reset form
    setName("")
    setPrice("")
    setProductId("")
    setQuantity("")
    setImageUrl("")
    setImagePreview(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.productName')}
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('form.productNamePlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.productId')}
        </label>
        <input
          type="text"
          id="productId"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('form.productIdPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.price')}
        </label>
        <input
          type="number"
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          step="0.01"
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="0.00"
        />
      </div>

      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.quantity')}
        </label>
        <input
          type="number"
          id="quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="1"
        />
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.image')} ({t('form.optional')})
        </label>
        <div className="space-y-2">
          <input
            type="file"
            id="imageFile"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                // Limit file size to 5MB
                if (file.size > 5 * 1024 * 1024) {
                  alert(t('form.error.imageTooLarge') || 'Image size must be less than 5MB')
                  e.target.value = ''
                  return
                }
                const reader = new FileReader()
                reader.onloadend = () => {
                  setImagePreview(reader.result as string)
                  setImageUrl("") // Clear URL if file is selected
                }
                reader.readAsDataURL(file)
              }
            }}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <div className="text-xs text-gray-500">
            {t('form.or')}
          </div>
          <input
            type="url"
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value)
              setImagePreview(null) // Clear preview if URL is entered
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('form.imageUrlPlaceholder') || 'Paste image URL'}
          />
        </div>
        {imagePreview && (
          <div className="mt-2">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-24 h-24 object-cover rounded-lg border border-gray-300"
            />
          </div>
        )}
        {imageUrl && !imagePreview && (
          <div className="mt-2">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-24 h-24 object-cover rounded-lg border border-gray-300"
              onError={() => {
                setImageUrl("")
                alert(t('form.error.invalidImageUrl') || 'Invalid image URL')
              }}
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
      >
        {t('form.submit')}
      </button>
    </form>
  )
}
