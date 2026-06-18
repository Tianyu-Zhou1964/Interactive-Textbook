'use client'

import { useState } from "react"
import { Section } from "@/lib/data-service"
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react"

interface SidebarLeftProps {
  sections: Section[]
  onSelect: (slug: string) => void
  activeSlug?: string
}

export function SidebarLeft({ sections, onSelect, activeSlug }: SidebarLeftProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* 遮罩层 (移动端) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 切换按钮 — 始终可见，左侧垂直居中 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed top-1/2 -translate-y-1/2 z-30 
          flex items-center gap-1 px-2 py-3
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
          shadow-lg rounded-r-lg
          hover:bg-gray-50 dark:hover:bg-gray-700 
          transition-all duration-300
          ${isOpen ? 'left-[272px]' : 'left-0'}
        `}
        title={isOpen ? '收起目录' : '展开目录'}
      >
        {isOpen ? <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" /> : <ChevronRight size={18} className="text-gray-600 dark:text-gray-300" />}
        {!isOpen && <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />}
      </button>

      {/* 侧栏面板 */}
      <div 
        className={`
          fixed left-0 top-0 bottom-0 z-20
          w-[272px] bg-white dark:bg-gray-900 
          border-r border-gray-200 dark:border-gray-700 
          shadow-xl
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">目录</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{sections.length} 个章节</p>
            </div>
          </div>
        </div>

        {/* Sections List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sections.map((section, index) => (
            <button 
              key={section.id} 
              onClick={() => {
                onSelect(section.slug)
                // 移动端点击后自动关闭
                if (window.innerWidth < 768) setIsOpen(false)
              }}
              className={`
                w-full text-left p-3 rounded-lg text-sm transition-all duration-200 
                flex items-start gap-3
                ${activeSlug === section.slug 
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium border-l-4 border-blue-500 -ml-0.5 pl-3.5' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:translate-x-0.5'
                }
              `}
            >
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 min-w-[20px]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="leading-relaxed">{section.title}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
