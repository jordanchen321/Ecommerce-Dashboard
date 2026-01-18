"use client"

import { useLanguage } from "@/contexts/LanguageContext"

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition duration-200 font-medium text-sm"
      title={language === 'en' ? '切换到中文' : 'Switch to English'}
    >
      {language === 'en' ? '中文' : 'EN'}
    </button>
  )
}
