"use client"

import type { Product } from "@/app/page"
import { useLanguage } from "@/contexts/LanguageContext"
import type { ColumnConfig } from "./ColumnManager"
import { evaluateFormula } from "@/lib/formulaEvaluator"

interface ProductTableProps {
  products: Product[]
  onRemove: (id: string) => void
  onEdit: (product: Product) => void
  columns: ColumnConfig[]
}

// Helper function to render cell value based on column type
function renderCellValue(product: Product, column: ColumnConfig): React.ReactNode {
  const value = product[column.field]

  if (value === undefined || value === null) {
    return <span className="text-gray-400">-</span>
  }

  switch (column.type) {
    case 'image':
      if (typeof value === 'string') {
        return (
          <img
            src={value}
            alt={column.label}
            className="w-16 h-16 object-cover rounded-lg border border-gray-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )
      }
      return (
        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )

    case 'currency':
      const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0
      return <span className="text-sm text-gray-700">${numValue.toFixed(2)}</span>

    case 'number':
      const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0
      return <span className="text-sm text-gray-700">{num}</span>

    case 'date':
      if (value instanceof Date) {
        return <span className="text-sm text-gray-700">{value.toLocaleDateString()}</span>
      }
      if (typeof value === 'string') {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return <span className="text-sm text-gray-700">{date.toLocaleDateString()}</span>
        }
      }
      return <span className="text-sm text-gray-700">{String(value)}</span>

    case 'text':
    default:
      return <span className="text-sm text-gray-700">{String(value)}</span>
  }
}

export default function ProductTable({ products, onRemove, onEdit, columns }: ProductTableProps) {
  const { t } = useLanguage()
  
  // Filter to only visible columns, and sort so actions is always last
  // Order: Core columns (in original order) -> Custom columns -> Actions
  const coreColumnOrder = ['image', 'productId', 'name', 'price', 'quantity', 'totalValue']
  const visibleColumns = columns
    .filter(col => col.visible)
    .sort((a, b) => {
      // Actions column should always be last
      if (a.field === 'actions') return 1
      if (b.field === 'actions') return -1
      
      // Both are core columns - maintain original order
      const aIndex = coreColumnOrder.indexOf(a.field)
      const bIndex = coreColumnOrder.indexOf(b.field)
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      
      // Custom columns should come after core columns but before actions
      if (a.isCustom && !b.isCustom) return 1
      if (!a.isCustom && b.isCustom) return -1
      
      // Both are custom - maintain original order (by id)
      if (a.isCustom && b.isCustom) {
        return a.id.localeCompare(b.id)
      }
      
      return 0
    })

  // Special handling for totalValue column (calculated field)
  const hasTotalValue = visibleColumns.some(col => col.field === 'totalValue')

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.field === 'actions' ? 'text-right' : ''
                }`}
              >
                {column.label}
              </th>
            ))}
            {!visibleColumns.some(col => col.field === 'actions') && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('table.actions')}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              {visibleColumns.map((column) => {
                // Special handling for calculated fields (totalValue and formula columns)
                if (column.field === 'totalValue') {
                  const price = typeof product.price === 'number' ? product.price : 0
                  const quantity = typeof product.quantity === 'number' ? product.quantity : 0
                  return (
                    <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${(price * quantity).toFixed(2)}
                    </td>
                  )
                }
                
                // Handle formula columns
                if (column.type === 'formula' && column.formula) {
                  const availableColumns = columns
                    .filter(col => col.type !== 'formula' && col.field !== 'actions' && col.field !== 'totalValue')
                    .map(col => col.field)
                  
                  const result = evaluateFormula(column.formula, product, availableColumns)
                  
                  if (result === null) {
                    return (
                      <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-red-500">
                        <span title="Formula evaluation error">Error</span>
                      </td>
                    )
                  }
                  
                  // Format as number (formula columns are always numeric)
                  // Check if result should be formatted as currency based on column label or default to number
                  const isCurrency = column.label.toLowerCase().includes('price') || 
                                    column.label.toLowerCase().includes('cost') ||
                                    column.label.toLowerCase().includes('total') ||
                                    column.label.toLowerCase().includes('amount')
                  
                  const formattedValue = isCurrency
                    ? `$${result.toFixed(2)}`
                    : Number.isInteger(result) 
                      ? result.toString()
                      : result.toFixed(2)
                  
                  return (
                    <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formattedValue}
                    </td>
                  )
                }

                if (column.field === 'actions') {
                  return (
                    <td key={column.id} className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => onEdit(product)}
                          className="text-blue-600 hover:text-blue-900 transition duration-200"
                        >
                          {t('table.edit')}
                        </button>
                        <button
                          onClick={() => onRemove(product.id)}
                          className="text-red-600 hover:text-red-900 transition duration-200"
                        >
                          {t('table.remove')}
                        </button>
                      </div>
                    </td>
                  )
                }

                return (
                  <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                    {renderCellValue(product, column)}
                  </td>
                )
              })}
              {!visibleColumns.some(col => col.field === 'actions') && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => onEdit(product)}
                      className="text-blue-600 hover:text-blue-900 transition duration-200"
                    >
                      {t('table.edit')}
                    </button>
                    <button
                      onClick={() => onRemove(product.id)}
                      className="text-red-600 hover:text-red-900 transition duration-200"
                    >
                      {t('table.remove')}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
