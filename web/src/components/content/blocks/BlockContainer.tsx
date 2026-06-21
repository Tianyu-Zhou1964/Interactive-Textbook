'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Plus, MessageSquare } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// =====================================================
// BLOCK CONTAINER - Notion-like wrapper with hover actions
// =====================================================
interface BlockContainerProps {
  blockId: string
  blockIndex: number
  children: React.ReactNode
  commentCount?: number
  onAddCodeBelow: (afterIndex: number) => void
  onComment: (blockId: string) => void
  onEdit: (blockId: string) => void
}

export function BlockContainer({ blockId, blockIndex, children, commentCount = 0, onAddCodeBelow, onComment, onEdit }: BlockContainerProps) {
  const { user } = useAuth()
  const t = useTranslations('blockContainer')
  const [isHovered, setIsHovered] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const handleEditClick = () => {
    if (!user) {
      flash(t('loginToEdit'))
      return
    }
    onEdit(blockId)
  }

  const handleAddClick = () => {
    if (!user) {
      flash(t('loginToAdd'))
      return
    }
    // 第二阶段接入「新增块走审核」，暂提示即将开放
    flash(t('addComingSoon'))
  }

  return (
    <div
      className="relative group w-full hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors rounded-xl -ml-2 p-2 border border-transparent hover:border-gray-100 dark:hover:border-gray-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Block Content */}
      <div className="block-content pr-12">
        {children}
      </div>

      {/* 评论数量标记 (右侧隐蔽显示) */}
      {commentCount > 0 && (
        <button
          onClick={() => onComment(blockId)}
          className="absolute right-2 bottom-2 flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded"
          title={t('commentCountTitle', { count: commentCount })}
        >
          <MessageSquare size={12} />
          <span>{commentCount}</span>
        </button>
      )}

      {/* Hover Actions Menu */}
      <div className={`absolute right-2 top-2 flex flex-col gap-1.5 transition-all duration-200 z-20 ${
        isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
      }`}>
        {/* Add Code Button */}
        <button
          onClick={handleAddClick}
          className="p-1.5 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg transition-colors flex items-center justify-center"
          title={user ? t('addTitle') : t('loginToAdd')}
        >
          <Plus size={16} />
        </button>

        {/* Comment Button */}
        <button
          onClick={() => onComment(blockId)}
          className="p-1.5 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg transition-colors flex items-center justify-center"
          title={t('commentTitle')}
        >
          <MessageSquare size={16} />
        </button>

        {/* Edit Button */}
        <button
          onClick={handleEditClick}
          className={`p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg transition-colors flex items-center justify-center ${
            user
              ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          title={user ? t('editTitle') : t('loginToEdit')}
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* 操作提示 */}
      {toast && (
        <div className="absolute right-14 top-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-30 animate-in fade-in duration-200">
          {toast}
        </div>
      )}
    </div>
  )
}
