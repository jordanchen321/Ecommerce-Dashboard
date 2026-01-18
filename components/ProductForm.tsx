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
    })

    // Reset form
    setName("")
    setPrice("")
    setProductId("")
    setQuantity("")
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

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
      >
        {t('form.submit')}
      </button>
    </form>
  )
}
