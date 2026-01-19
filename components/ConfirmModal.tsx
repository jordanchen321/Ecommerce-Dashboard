"use client"

import { useLanguage } from "@/contexts/LanguageContext"

interface ConfirmModalProps {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }: ConfirmModalProps) {
  const { t } = useLanguage()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        {/* Modal Card */}
        <div 
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-gray-800">
            {t('confirm.title') || 'Confirm'}
          </h3>
          <p className="text-gray-600">
            {message}
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition duration-200 font-medium"
            >
              {t('modal.cancel') || 'Cancel'}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition duration-200 font-medium"
            >
              {t('confirm.delete') || 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
