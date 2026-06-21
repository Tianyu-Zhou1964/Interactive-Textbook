'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import Image from 'next/image'
import { useLang } from '@/contexts/LanguageContext'

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const { switchLang } = useLang()
  const t = useTranslations('welcome')

  useEffect(() => {
    // 若上一动作是切语言（switchLang 打了标记），跳转后不再弹欢迎窗
    const langSwitching = sessionStorage.getItem('lang_switching')
    if (langSwitching) {
      sessionStorage.removeItem('lang_switching')
      setIsOpen(false)
    } else {
      setIsOpen(true)
    }
  }, [])

  const handleLangSelect = (lang: 'zh' | 'en') => {
    setIsOpen(false)
    switchLang(lang)  // 持久化 + 打标记 + 整页跳转，逻辑统一在 LanguageContext
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        {/* Header */}
        <div className="relative p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('title')}
          </h2>
          <button 
            onClick={() => handleLangSelect('zh')}
            className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* 语言选择置顶 */}
        <div className="px-6 pt-6 pb-2 flex flex-col items-center gap-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('chooseLanguage')}
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => handleLangSelect('zh')}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              {t('startZh')}
            </button>
            <button
              onClick={() => handleLangSelect('en')}
              className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              {t('startEn')}
            </button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>{t('openSource')}</span>
            <a
              href="https://github.com/Tianyu-Zhou1964/PIE-Handmaking_LLM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6 ...">
          <p className="text-lg font-medium ...">
            {t('intro')}
          </p>

          <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full text-sm font-bold">1</span>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">{t('step1Title')}</strong>
                <span className="block mt-1">{t('step1Desc')}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full text-sm font-bold">2</span>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">{t('step2Title')}</strong>
                <span className="block mt-1 break-all">
                  {t('step2Desc')}
                  <a 
                    href="https://v.douyin.com/XZWeuSl-IIY/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
                  >
                    https://v.douyin.com/XZWeuSl-IIY/
                  </a>
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full text-sm font-bold">3</span>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">{t('step3Title')}</strong>
                <span className="block mt-1">{t('step3DescPrefix')}<strong className="text-gray-900 dark:text-gray-100">{t('authorName')}</strong>{t('step3DescSuffix')}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative inline-block bg-white p-2 rounded-xl shadow-lg border border-gray-100">
               <Image 
                 src="/QRcode.jpg" 
                 width={200} 
                 height={200} 
                 alt={t('qrAlt')}
                 className="rounded-lg"
               />
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 italic">
              {t('qrCaption')}
            </p>
          </div>

          <div className="text-center">
            <p className="text-lg font-medium text-indigo-600 dark:text-indigo-400 italic">
              {t('blessing')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
