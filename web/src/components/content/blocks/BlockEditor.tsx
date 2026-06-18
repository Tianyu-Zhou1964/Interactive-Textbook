'use client'

import { useState } from 'react'
import { Pencil, X, Check } from 'lucide-react'

// =====================================================
// BLOCK EDITOR (For specific block editing)
// =====================================================
export function BlockEditor({
  content,
  type,
  onCancel,
  onSubmit
}: {
  content: string,
  type: 'code' | 'markdown',
  onCancel: () => void,
  onSubmit: (newContent: string) => void
}) {
  const [value, setValue] = useState(content)

  return (
    <div className="my-4 border-2 border-amber-400 dark:border-amber-600 rounded-lg overflow-hidden shadow-lg bg-white dark:bg-gray-900 relative animate-in fade-in zoom-in-95 duration-200 ring-4 ring-amber-100 dark:ring-amber-900">
      {/* Editor Header */}
      <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-2 border-b border-amber-100 dark:border-amber-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Pencil size={14} />
          Editing {type === 'code' ? 'Code Block' : 'Markdown'}
        </span>
        <div className="text-xs text-amber-600 dark:text-amber-400">
          修改后提交建议
        </div>
      </div>

      {/* Editor Content */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`w-full p-4 min-h-[150px] resize-y focus:outline-none ${
          type === 'code'
            ? 'font-mono text-sm bg-gray-900 text-gray-100'
            : 'text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 font-sans leading-relaxed'
        }`}
        placeholder="Edit content..."
        autoFocus
      />

      {/* Editor Footer (Actions) */}
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-gray-100 transition-colors flex items-center gap-1"
        >
          <X size={16} />
          Cancel
        </button>
        <button
          onClick={() => onSubmit(value)}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-lg hover:bg-amber-700 shadow-sm transition-all flex items-center gap-1"
        >
          <Check size={16} />
          Submit Suggestion
        </button>
      </div>
    </div>
  )
}
