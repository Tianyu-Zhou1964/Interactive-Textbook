'use client'

import { useState, useEffect, useRef } from 'react'

// API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
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
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    if (!reason.trim()) {
      setToast({ type: 'error', message: 'Please provide a reason for your suggestion' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/submit_suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_id: blockId,
          suggested_content: newContent,
          reason: reason.trim(),
          user_id: null // Anonymous for now
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to submit suggestion')
      }

      const result = await response.json()
      
      setToast({ type: 'success', message: 'Suggestion submitted for review!' })
      
      // Wait a moment to show success, then close
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)

    } catch (error: any) {
      console.error('[SuggestionModal] Submit error:', error)
      setToast({ type: 'error', message: error.message || 'Failed to submit suggestion' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Submit Suggestion</h2>
              <p className="text-amber-100 text-sm">Your changes will be reviewed by an admin</p>
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
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {blockType === 'code' ? '📝 Code Block' : '📄 Markdown Block'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {blockId.substring(0, 8)}...
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Changes: {Math.abs(newContent.length - originalContent.length)} characters modified
              </p>
            </div>

            {/* Reason Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for this change <span className="text-red-500">*</span>
              </label>
              <textarea
                ref={textareaRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Fix typo in variable name, Optimize loop performance, Add missing import..."
                className="w-full h-32 p-3 border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-400 mt-1">
                Be specific about what you changed and why. This helps reviewers approve faster.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim()}
              className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-md hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Suggestion
                </>
              )}
            </button>
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
}
