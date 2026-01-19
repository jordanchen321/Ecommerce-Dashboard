"use client"

import { useState, FormEvent, useEffect } from "react"
import type { Product } from "@/app/page"
import { useLanguage } from "@/contexts/LanguageContext"
import type { ColumnConfig } from "./ColumnManager"

interface EditProductModalProps {
  product: Product | null
  onSave: (product: Product) => void
  onCancel: () => void
  customColumns?: ColumnConfig[]
}

export default function EditProductModal({ product, onSave, onCancel, customColumns = [] }: EditProductModalProps) {
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // Dynamic state for custom columns
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [customImagePreviews, setCustomImagePreviews] = useState<Record<string, string>>({})
  
  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    
    if (product) {
      window.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [product, onCancel])

  // Initialize form with product data when product changes
  useEffect(() => {
    if (product) {
      setName(product.name || "")
      setPrice(product.priceSet === false ? "" : String(product.price ?? ""))
      setProductId(product.productId || "")
      setQuantity(product.quantitySet === false ? "" : String(product.quantity ?? ""))
      setImagePreview(product.image || null)
      
      // Initialize custom fields from product
      // Skip formula columns - they are calculated automatically
      const initialFields: Record<string, string> = {}
      const initialPreviews: Record<string, string> = {}
      
      customColumns.forEach(col => {
        if (col.isCustom && 
            !['name', 'price', 'productId', 'quantity', 'image'].includes(col.field) &&
            col.type !== 'formula') { // Skip formula columns
          const value = product[col.field]
          if (value !== undefined && value !== null) {
            if (col.type === 'image') {
              initialPreviews[col.field] = String(value)
            } else if (col.type === 'date' && value instanceof Date) {
              initialFields[col.field] = value.toISOString().split('T')[0]
            } else {
              initialFields[col.field] = String(value)
            }
          } else {
            initialFields[col.field] = ''
            if (col.type === 'image') {
              initialPreviews[col.field] = ''
            }
          }
        }
      })
      
      setCustomFields(initialFields)
      setCustomImagePreviews(initialPreviews)
    }
  }, [product, customColumns])

  if (!product) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    // Required fields: name + productId. Price/quantity are optional.
    if (!name || !productId) {
      alert(t('form.error.allFields'))
      return
    }

    let priceNum = 0
    let quantityNum = 0
    let priceSet = false
    let quantitySet = false

    if (price.trim() !== "") {
      const parsed = parseFloat(price)
      if (isNaN(parsed) || parsed <= 0) {
        alert(t('form.error.validPrice'))
        return
      }
      priceNum = parsed
      priceSet = true
    }

    if (quantity.trim() !== "") {
      const parsed = parseInt(quantity)
      if (isNaN(parsed) || parsed <= 0) {
        alert(t('form.error.validQuantity'))
        return
      }
      quantityNum = parsed
      quantitySet = true
    }

    // Build product object with core fields and custom fields
    const customFieldsWithImages = { ...customFields }
    Object.keys(customImagePreviews).forEach(field => {
      if (customImagePreviews[field]) {
        customFieldsWithImages[field] = customImagePreviews[field]
      }
    })
    
    const updatedProduct: Product = {
      ...product, // Preserve id and any other fields
      name,
      productId,
      price: priceNum,
      priceSet,
      quantity: quantityNum,
      quantitySet,
      image: imagePreview || undefined,
      ...customFieldsWithImages, // Add custom fields (with image previews)
    }
    
    onSave(updatedProduct)
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {t('modal.editProduct')}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition duration-200"
            aria-label={t('modal.cancel')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.productName')}
            </label>
            <input
              type="text"
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('form.productNamePlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="edit-productId" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.productId')}
            </label>
            <input
              type="text"
              id="edit-productId"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('form.productIdPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.price')}
            </label>
            <input
              type="number"
              id="edit-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="edit-quantity" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.quantity')}
            </label>
            <input
              type="number"
              id="edit-quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1"
            />
          </div>

          <div>
            <label htmlFor="edit-image" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.image')} ({t('form.optional')})
            </label>
            <input
              type="file"
              id="edit-image"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
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
                  <label htmlFor={`edit-custom-${column.field}`} className="block text-sm font-medium text-gray-700 mb-1">
                    {column.label} ({t('form.optional')})
                  </label>
                  {column.type === 'number' || column.type === 'currency' ? (
                    <input
                      type="number"
                      id={`edit-custom-${column.field}`}
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
                      id={`edit-custom-${column.field}`}
                      value={fieldValue}
                      onChange={(e) => setCustomFields({ ...customFields, [column.field]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : column.type === 'image' ? (
                    <div>
                      <input
                        type="file"
                        id={`edit-custom-${column.field}`}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
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
                      id={`edit-custom-${column.field}`}
                      value={fieldValue}
                      onChange={(e) => setCustomFields({ ...customFields, [column.field]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter ${column.label.toLowerCase()}`}
                    />
                  )}
                </div>
              )
            })}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              {t('modal.save')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              {t('modal.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
