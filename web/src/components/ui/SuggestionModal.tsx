'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { X, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface SuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  blockId: string
  blockType: 'code' | 'markdown'
  originalContent: string
  newContent: string
  onSuccess?: () => void
}

type ToastType = 'success' | 'error' | null

export function SuggestionModal({ 
  isOpen, 
  onClose, 
  blockId, 
  blockType, 
  originalContent, 
  newContent,
  onSuccess 
}: SuggestionModalProps) {
  const { user } = useAuth()
  const t = useTranslations('suggestion')
  const tCommon = useTranslations('common')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => setMounted(true), [])

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleSubmit = async () => {
    if (!user) {
      setToast({ type: 'error', message: t('loginRequired') })
      return
    }
    if (!reason.trim()) {
      setToast({ type: 'error', message: t('needReason') })
      return
    }

    setIsSubmitting(true)

    try {
      // user_id 由后端从登录 token 解出，前端不再传
      const response = await authFetch(`/submit_suggestion`, {
        method: 'POST',
        body: JSON.stringify({
          block_id: blockId,
          suggested_content: newContent,
          reason: reason.trim(),
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || t('failed'))
      }

      await response.json()

      setToast({ type: 'success', message: t('success') })
      
      // Wait a moment to show success, then close
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)

    } catch (error: any) {
      console.error('[SuggestionModal] Submit error:', error)
      setToast({ type: 'error', message: error.message || t('failed') })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !mounted) return null

  const modal = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{t('title')}</h2>
              <p className="text-amber-100 text-sm">{t('subtitle')}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Block Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {blockType === 'code' ? `📝 ${t('codeBlock')}` : `📄 ${t('markdownBlock')}`}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {blockId.substring(0, 8)}...
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('charsModified', { count: Math.abs(newContent.length - originalContent.length) })}
              </p>
            </div>

            {/* Reason Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('reasonLabel')} <span className="text-red-500">*</span>
              </label>
              <textarea
                ref={textareaRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                className="w-full h-32 p-3 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900 transition-all resize-none"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('reasonHint')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800">
            {!user ? (
              <span className="text-xs text-amber-600 dark:text-amber-400">{t('loginRequired')}</span>
            ) : <span />}
            <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim() || !user}
              className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-md hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {t('submit')}
                </>
              )}
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification - High z-index to ensure visibility */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 p-0.5 hover:bg-white/20 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  )

  return createPortal(modal, document.body)
}
