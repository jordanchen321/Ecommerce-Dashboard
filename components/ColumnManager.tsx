"use client"

import { useState, useEffect, useRef } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

export interface ColumnConfig {
  id: string
  field: string
  label: string
  visible: boolean
  isCustom: boolean
  type?: 'text' | 'number' | 'currency' | 'date' | 'image'
}

interface ColumnManagerProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
  availableFields: string[] // Fields available in products
}

export default function ColumnManager({ columns, onColumnsChange, availableFields }: ColumnManagerProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [newColumnField, setNewColumnField] = useState("")
  const [newColumnLabel, setNewColumnLabel] = useState("")
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'currency' | 'date' | 'image'>('text')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
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
    // Don't allow removing core columns, only custom ones
    const column = columns.find(col => col.id === columnId)
    if (column && column.isCustom) {
      const updated = columns.filter(col => col.id !== columnId)
      onColumnsChange(updated)
    }
  }

  const addColumn = () => {
    if (!newColumnField.trim() || !newColumnLabel.trim()) {
      alert("Please enter both field name and label")
      return
    }

    // Check if field already exists
    if (columns.some(col => col.field === newColumnField.trim())) {
      alert("A column with this field name already exists")
      return
    }

    const newColumn: ColumnConfig = {
      id: `custom-${Date.now()}`,
      field: newColumnField.trim(),
      label: newColumnLabel.trim(),
      visible: true,
      isCustom: true,
      type: newColumnType,
    }

    onColumnsChange([...columns, newColumn])
    setNewColumnField("")
    setNewColumnLabel("")
    setNewColumnType('text')
  }

  const visibleColumns = columns.filter(col => col.visible)
  const hiddenColumns = columns.filter(col => !col.visible)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition duration-200 text-sm font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Manage Columns ({visibleColumns.length}/{columns.length})
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Column Settings</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Visible Columns */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Visible Columns</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {visibleColumns.map((column) => (
                <div key={column.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => toggleColumn(column.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{column.label}</span>
                    {column.isCustom && (
                      <span className="text-xs text-blue-600">(custom)</span>
                    )}
                  </div>
                  {column.isCustom && (
                    <button
                      onClick={() => removeColumn(column.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      title="Remove column"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hidden Columns */}
          {hiddenColumns.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Hidden Columns</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {hiddenColumns.map((column) => (
                  <div key={column.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => toggleColumn(column.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-500">{column.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Column */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add Custom Column</h4>
            <div className="space-y-2">
              <input
                type="text"
                value={newColumnField}
                onChange={(e) => setNewColumnField(e.target.value)}
                placeholder="Field name (e.g., 'category', 'brand')"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newColumnLabel}
                onChange={(e) => setNewColumnLabel(e.target.value)}
                placeholder="Display label (e.g., 'Category', 'Brand')"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newColumnType}
                onChange={(e) => setNewColumnType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="date">Date</option>
                <option value="image">Image</option>
              </select>
              <button
                onClick={addColumn}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition duration-200"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
