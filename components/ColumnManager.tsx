"use client"

import { useState, useEffect, useRef } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

export interface ColumnConfig {
  id: string
  field: string
  label: string
  visible: boolean
  isCustom: boolean
  type?: 'text' | 'number' | 'currency' | 'date' | 'image' | 'formula'
  formula?: string // Formula expression for calculated columns (e.g., "price * quantity")
}

interface ColumnManagerProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
  availableFields: string[] // Fields available in products
}

export default function ColumnManager({ columns, onColumnsChange, availableFields }: ColumnManagerProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [newColumnLabel, setNewColumnLabel] = useState("")
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'currency' | 'date' | 'image' | 'formula'>('text')
  const [newColumnFormula, setNewColumnFormula] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Get available column names for formula suggestions (only numeric columns)
  // Numeric columns: 'number', 'currency' types, and core numeric fields (price, quantity)
  const isNumericColumn = (col: ColumnConfig): boolean => {
    // Core numeric fields
    if (col.field === 'price' || col.field === 'quantity') {
      return true
    }
    // Numeric column types
    return col.type === 'number' || col.type === 'currency'
  }
  
  const availableColumnNames = columns
    .filter(col => 
      col.type !== 'formula' && 
      col.field !== 'actions' && 
      col.field !== 'totalValue' &&
      isNumericColumn(col)
    )
    .map(col => col.field)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const toggleColumn = (columnId: string) => {
    const updated = columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    )
    onColumnsChange(updated)
  }

  const removeColumn = (columnId: string) => {
    // Allow removing custom columns, and allow removing Total Value (special core calculated column)
    const column = columns.find(col => col.id === columnId)
    if (column && (column.isCustom || column.field === 'totalValue')) {
      const updated = columns.filter(col => col.id !== columnId)
      onColumnsChange(updated)
    }
  }

  const addColumn = () => {
    if (!newColumnLabel.trim()) {
      alert(t('columns.error.labelRequired'))
      return
    }

    // For formula columns, validate formula
    if (newColumnType === 'formula') {
      if (!newColumnFormula.trim()) {
        alert(t('columns.error.formulaRequired') || 'Please enter a formula')
        return
      }
      
      // Validate that formula only uses numeric columns
      const formulaText = newColumnFormula.trim().toLowerCase()
      const allColumnFields = columns
        .filter(col => col.field !== 'actions' && col.field !== 'totalValue')
        .map(col => col.field.toLowerCase())
      
      // Check for non-numeric columns in formula
      const nonNumericColumns = columns
        .filter(col => 
          col.field !== 'actions' && 
          col.field !== 'totalValue' &&
          !isNumericColumn(col)
        )
        .map(col => col.field.toLowerCase())
      
      for (const nonNumericCol of nonNumericColumns) {
        // Use word boundary to match whole column names only
        const regex = new RegExp(`\\b${nonNumericCol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        if (regex.test(formulaText)) {
          const errorMsg = (t('columns.error.nonNumericColumn') || 'Formula can only use numeric columns. "{column}" is not a numeric column.').replace('{column}', nonNumericCol)
          alert(errorMsg)
          return
        }
      }
    }

    // Generate field name from label: lowercase, replace spaces with underscores, remove special chars
    const fieldName = newColumnLabel.trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')

    // Check if field already exists
    if (columns.some(col => col.field === fieldName)) {
      alert(t('columns.error.duplicate'))
      return
    }

    const newColumn: ColumnConfig = {
      id: `custom-${Date.now()}`,
      field: fieldName,
      label: newColumnLabel.trim(),
      visible: true,
      isCustom: true,
      type: newColumnType,
      ...(newColumnType === 'formula' && { formula: newColumnFormula.trim() }),
    }

    onColumnsChange([...columns, newColumn])
    setNewColumnLabel("")
    setNewColumnType('text')
    setNewColumnFormula("")
  }

  const visibleColumns = columns.filter(col => col.visible)
  const hiddenColumns = columns.filter(col => !col.visible)

  const getDisplayLabel = (column: ColumnConfig): string => {
    // Always translate core/default columns at render time
    if (!column.isCustom) {
      switch (column.field) {
        case 'image':
          return t('table.image')
        case 'productId':
          return t('table.productId')
        case 'name':
          return t('table.name')
        case 'price':
          return t('table.price')
        case 'quantity':
          return t('table.quantity')
        case 'totalValue':
          return t('table.totalValue')
        case 'actions':
          return t('table.actions')
        default:
          break
      }
    }
    return column.label
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-lg transition duration-200 text-xs md:text-sm font-medium touch-manipulation"
      >
        <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <span className="hidden sm:inline">{t('columns.manage')}</span>
        <span className="sm:hidden">{t('columns.manage')}</span>
        <span className="text-xs">({visibleColumns.length}/{columns.length})</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop overlay for mobile */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal/Dropdown */}
          <div className="fixed inset-x-0 bottom-0 md:absolute md:right-0 md:bottom-auto md:mt-2 md:inset-x-auto md:w-80 w-full max-h-[90vh] md:max-h-[80vh] bg-white md:rounded-lg shadow-xl border border-gray-200 z-50 p-4 md:p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{t('columns.title')}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

          {/* Visible Columns */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('columns.visible')}</h4>
            {visibleColumns.length > 0 ? (
              <div className="space-y-2 max-h-40 md:max-h-40 overflow-y-auto">
                {visibleColumns.map((column) => (
                  <div key={column.id} className="flex items-center justify-between p-2 md:p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={column.visible}
                        onChange={() => toggleColumn(column.id)}
                        className="rounded flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 truncate">{getDisplayLabel(column)}</span>
                      {column.isCustom && (
                        <span className="text-xs text-blue-600 flex-shrink-0">{t('columns.custom')}</span>
                      )}
                    </div>
                    {column.isCustom && (
                      <button
                        onClick={() => removeColumn(column.id)}
                        className="text-red-500 hover:text-red-700 text-xs ml-2 flex-shrink-0 p-1"
                        title={t('columns.remove')}
                        aria-label={t('columns.remove')}
                      >
                        <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">{t('columns.noVisible') || 'No visible columns'}</p>
            )}
          </div>

          {/* Hidden Columns */}
          {hiddenColumns.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">{t('columns.hidden')}</h4>
              <div className="space-y-2 max-h-32 md:max-h-32 overflow-y-auto">
                {hiddenColumns.map((column) => (
                  <div key={column.id} className="flex items-center gap-2 p-2 md:p-2 bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => toggleColumn(column.id)}
                      className="rounded flex-shrink-0"
                    />
                    <span className="text-sm text-gray-500 truncate">{getDisplayLabel(column)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Column */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('columns.addCustom')}</h4>
            <div className="space-y-2">
              <input
                type="text"
                value={newColumnLabel}
                onChange={(e) => setNewColumnLabel(e.target.value)}
                placeholder={t('columns.labelPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newColumnType}
                onChange={(e) => {
                  setNewColumnType(e.target.value as any)
                  if (e.target.value !== 'formula') {
                    setNewColumnFormula("")
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="date">Date</option>
                <option value="image">Image</option>
                <option value="formula">{t('columns.formula') || 'Formula (Calculated)'}</option>
              </select>
              {newColumnType === 'formula' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newColumnFormula}
                    onChange={(e) => setNewColumnFormula(e.target.value)}
                    placeholder={t('columns.formulaPlaceholder') || 'e.g., price * quantity, (price - discount) * quantity'}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <div className="text-xs text-gray-500">
                    <p className="mb-1">{t('columns.availableColumns') || 'Available columns:'}</p>
                    <div className="flex flex-wrap gap-1">
                      {availableColumnNames.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setNewColumnFormula(prev => prev + name)}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2">{t('columns.formulaHelp') || 'Use: +, -, *, /, (, ). Only numeric columns can be used. Example: price * quantity'}</p>
                    {availableColumnNames.length === 0 && (
                      <p className="mt-1 text-amber-600 text-xs font-medium">
                        {t('columns.noNumericColumns') || 'No numeric columns available. Add number or currency columns first.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={addColumn}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition duration-200"
              >
                {t('columns.add')}
              </button>
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  )
}
