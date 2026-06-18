'use client'

import { useState } from 'react'
import { Pencil, Plus, MessageSquare } from 'lucide-react'

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
}

export function BlockContainer({ blockId, blockIndex, children, commentCount = 0, onAddCodeBelow, onComment }: BlockContainerProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showEditToast, setShowEditToast] = useState(false)
  const [showAddToast, setShowAddToast] = useState(false)

  const handleEditClick = () => {
    setShowEditToast(true)
    setTimeout(() => setShowEditToast(false), 2000)
  }

  const handleAddClick = () => {
    setShowAddToast(true)
    setTimeout(() => setShowAddToast(false), 2000)
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
          title={`${commentCount} 条讨论`}
        >
          <MessageSquare size={12} />
          <span>{commentCount}</span>
        </button>
      )}

      {/* Hover Actions Menu */}
      <div className={`absolute right-2 top-2 flex flex-col gap-1.5 transition-all duration-200 z-20 ${
        isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
      }`}>
        {/* Add Code Button - 提示暂不可用 */}
        <button
          onClick={handleAddClick}
          className="p-1.5 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg transition-colors flex items-center justify-center cursor-not-allowed"
          title="添加代码功能暂时不可用"
        >
          <Plus size={16} />
        </button>

        {/* Comment Button */}
        <button
          onClick={() => onComment(blockId)}
          className="p-1.5 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg transition-colors flex items-center justify-center"
          title="评论此区块"
        >
          <MessageSquare size={16} />
        </button>

        {/* Edit Button - 提示暂不可用 */}
        <button
          onClick={handleEditClick}
          className="p-1.5 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg transition-colors flex items-center justify-center cursor-not-allowed"
          title="编辑功能暂时不可用"
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* 添加功能不可用提示 */}
      {showAddToast && (
        <div className="absolute right-14 top-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-30 animate-in fade-in duration-200">
          添加功能暂时不可用
        </div>
      )}

      {/* 编辑不可用提示 */}
      {showEditToast && (
        <div className="absolute right-14 top-[72px] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-30 animate-in fade-in duration-200">
          编辑功能暂时不可用
        </div>
      )}
    </div>
  )
}
