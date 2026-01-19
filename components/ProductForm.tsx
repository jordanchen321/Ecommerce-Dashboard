"use client"

import { useState, FormEvent, useEffect } from "react"
import type { Product } from "@/app/page"
import { useLanguage } from "@/contexts/LanguageContext"
import type { ColumnConfig } from "./ColumnManager"

interface ProductFormProps {
  onAdd: (product: Omit<Product, "id">) => void
  customColumns?: ColumnConfig[] // Custom columns that need input fields
}

export default function ProductForm({ onAdd, customColumns = [] }: ProductFormProps) {
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // Dynamic state for custom columns - only for custom columns (not core fields)
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [customImagePreviews, setCustomImagePreviews] = useState<Record<string, string>>({})
  
  // Initialize custom fields when customColumns change
  // Skip formula columns - they are calculated automatically
  useEffect(() => {
    const initialFields: Record<string, string> = {}
    const initialPreviews: Record<string, string> = {}
    customColumns.forEach(col => {
      if (col.isCustom && 
          !['name', 'price', 'productId', 'quantity', 'image'].includes(col.field) &&
          col.type !== 'formula') { // Skip formula columns
        initialFields[col.field] = ''
        if (col.type === 'image') {
          initialPreviews[col.field] = ''
        }
      }
    })
    setCustomFields(initialFields)
    setCustomImagePreviews(initialPreviews)
  }, [customColumns])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    // Required fields: name + productId. Price/quantity are optional.
    if (!name || !productId) {
      alert(t('form.error.allFields'))
      return
    }

    let priceNum: number | undefined = undefined
    let quantityNum: number | undefined = undefined

    if (price.trim() !== "") {
      const parsed = parseFloat(price)
      if (isNaN(parsed) || parsed <= 0) {
        alert(t('form.error.validPrice'))
        return
      }
      priceNum = parsed
    }

    if (quantity.trim() !== "") {
      const parsed = parseInt(quantity)
      if (isNaN(parsed) || parsed <= 0) {
        alert(t('form.error.validQuantity'))
        return
      }
      quantityNum = parsed
    }

    // Build product object with core fields and custom fields
    // For image type custom fields, use the preview (base64) instead of the field value
    const customFieldsWithImages = { ...customFields }
    Object.keys(customImagePreviews).forEach(field => {
      if (customImagePreviews[field]) {
        customFieldsWithImages[field] = customImagePreviews[field]
      }
    })
    
    const productData: Omit<Product, "id"> = {
      name,
      productId,
      ...(priceNum !== undefined ? { price: priceNum } : {}),
      ...(quantityNum !== undefined ? { quantity: quantityNum } : {}),
      image: imagePreview || undefined,
      ...customFieldsWithImages, // Add custom fields (with image previews)
    }
    
    onAdd(productData)

    // Reset form
    setName("")
    setPrice("")
    setProductId("")
    setQuantity("")
    setImagePreview(null)
    // Reset custom fields (skip formula columns)
    const resetFields: Record<string, string> = {}
    const resetPreviews: Record<string, string> = {}
    customColumns.forEach(col => {
      if (col.isCustom && 
          !['name', 'price', 'productId', 'quantity', 'image'].includes(col.field) &&
          col.type !== 'formula') { // Skip formula columns
        resetFields[col.field] = ''
        if (col.type === 'image') {
          resetPreviews[col.field] = ''
        }
      }
    })
    setCustomFields(resetFields)
    setCustomImagePreviews(resetPreviews)
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
              }
              reader.readAsDataURL(file)
            }
          }}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {imagePreview && (
          <div className="mt-2">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-24 h-24 object-cover rounded-lg border border-gray-300"
            />
          </div>
        )}
      </div>

      {/* Dynamic custom column inputs */}
      {/* Skip formula columns - they are calculated automatically */}
      {customColumns
        .filter(col => 
          col.isCustom && 
          !['name', 'price', 'productId', 'quantity', 'image'].includes(col.field) &&
          col.type !== 'formula' // Don't show input fields for formula columns
        )
        .map((column) => {
          const fieldValue = customFields[column.field] || ''
          
          return (
            <div key={column.id}>
              <label htmlFor={`custom-${column.field}`} className="block text-sm font-medium text-gray-700 mb-1">
                {column.label} ({t('form.optional')})
              </label>
              {column.type === 'number' || column.type === 'currency' ? (
                <input
                  type="number"
                  id={`custom-${column.field}`}
                  value={fieldValue}
                  onChange={(e) => setCustomFields({ ...customFields, [column.field]: e.target.value })}
                  step={column.type === 'currency' ? '0.01' : '1'}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={column.type === 'currency' ? '0.00' : '0'}
                />
              ) : column.type === 'date' ? (
                <input
                  type="date"
                  id={`custom-${column.field}`}
                  value={fieldValue}
                  onChange={(e) => setCustomFields({ ...customFields, [column.field]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : column.type === 'image' ? (
                <div>
                  <input
                    type="file"
                    id={`custom-${column.field}`}
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
                          setCustomImagePreviews({ ...customImagePreviews, [column.field]: reader.result as string })
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {customImagePreviews[column.field] && (
                    <div className="mt-2">
                      <img
                        src={customImagePreviews[column.field]}
                        alt={column.label}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  id={`custom-${column.field}`}
                  value={fieldValue}
                  onChange={(e) => setCustomFields({ ...customFields, [column.field]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Enter ${column.label.toLowerCase()}`}
                />
              )}
            </div>
          )
        })}

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
      >
        {t('form.submit')}
      </button>
    </form>
  )
}
