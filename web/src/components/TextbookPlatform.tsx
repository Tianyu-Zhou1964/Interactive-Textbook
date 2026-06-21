// lang 优先级：URL ?lang= > localStorage > 默认 'zh'
// 修改语言后需要重新 fetch TOC，见 TextbookPlatform.tsx

'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { SidebarLeft } from '@/components/layout/SidebarLeft'
import { MainContent } from '@/components/content/MainContent'
import { ChapterDiscussion } from '@/components/discussion/ChapterDiscussion'
import { ChatBox } from '@/components/ai/ChatBox'
import { WelcomeModal } from '@/components/ui/WelcomeModal'
import { Section, ChapterData } from '@/lib/data-service'
import { MessageCircle, X } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'

interface TextbookPlatformProps {
  sections: Section[]
  initialChapterData: ChapterData
  currentSlug: string
}

// Unified sidebar state
type SidebarType = 'none' | 'ai' | 'discussion'

/**
 * TextbookPlatform - Main Layout Component
 * 
 * Layout Architecture:
 * - Both AI and Discussion panels are LAYOUT SHIFTERS
 * - They push the main content to the left with mr-80
 * - Only one can be open at a time (mutually exclusive)
 */
export function TextbookPlatform({ sections, initialChapterData, currentSlug }: TextbookPlatformProps) {
  const router = useRouter()
  const t = useTranslations('platform')
  const tChat = useTranslations('chat')
  const { lang, switchLang } = useLang()
  // sections 由服务端按当前 lang 渲染；切语言走整页跳转，故无需本地状态

  // Unified sidebar state - only one panel can be open at a time
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>('none')
  
  // Active block ID for block-level comments
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  
  // Chapter data
  const [chapterData, setChapterData] = useState<ChapterData>(initialChapterData)
  const [activeSlug, setActiveSlug] = useState(currentSlug)
  const [isLoading, setIsLoading] = useState(false)
  
  // Vision sync for AI (暂时关闭，服务器资源有限)
  const visionSync = false

  const handleChapterSelect = useCallback(async (slug: string) => {
    if (slug === activeSlug) return
    
    setIsLoading(true)
    setActiveSlug(slug)
    setActiveBlockId(null) // Reset active block on chapter change
    router.push(`/?chapter=${encodeURIComponent(slug)}&lang=${lang}`, { scroll: false })
    
    try {
      const bookId = sections[0]?.bookId
      const res = await fetch(`/api/chapter?slug=${encodeURIComponent(slug)}&bookId=${bookId ?? ''}`)
      const data = await res.json()
      if (data && data.blocks) {
        setChapterData(data)
      }
    } catch (e) {
      console.error('Failed to load chapter', e)
    } finally {
      setIsLoading(false)
    }
  }, [activeSlug, router, lang, sections])

  // Toggle handlers
  const toggleAI = useCallback(() => {
    setActiveSidebar(prev => prev === 'ai' ? 'none' : 'ai')
  }, [])

  const toggleDiscussion = useCallback(() => {
    setActiveSidebar(prev => prev === 'discussion' ? 'none' : 'discussion')
  }, [])

  const closeSidebar = useCallback(() => {
    setActiveSidebar('none')
    setActiveBlockId(null)
  }, [])

  // Handle block-level comment
  const handleCommentBlock = useCallback((blockId: string) => {
    setActiveBlockId(blockId)
    setActiveSidebar('discussion')
  }, [])

  // Clear block-level filter (back to chapter-wide discussion)
  const clearBlockId = useCallback(() => {
    setActiveBlockId(null)
  }, [])

  // 切换语言交给 LanguageContext.switchLang（整页跳转，服务端重新拉整本书数据）
  const handleLangSwitch = useCallback(() => {
    switchLang(lang === 'zh' ? 'en' : 'zh')
  }, [lang, switchLang])

  // Computed states
  const isAIOpen = activeSidebar === 'ai'
  const isDiscussionOpen = activeSidebar === 'discussion'
  const isSidebarOpen = activeSidebar !== 'none'

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">

      {/* ============================================ */}
      {/* 1. LEFT SIDEBAR - Table of Contents          */}
      {/* ============================================ */}
      <div className="print:hidden">
        <SidebarLeft 
          sections={sections} 
          onSelect={handleChapterSelect}
          activeSlug={activeSlug}
        />
      </div>

      {/* ============================================ */}
      {/* 2. MAIN CONTENT - Responsive to Sidebar     */}
      {/* Both AI and Discussion shift the layout     */}
      {/* ============================================ */}
      <main 
        className={`
          flex-1 relative 
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'mr-[480px]' : 'mr-0'}
        `}
      >
        <MainContent 
          chapterTitle={chapterData.title}
          lang={lang}
          sectionId={chapterData.sectionId}
          blocks={chapterData.blocks}
          isLoading={isLoading}
          // Sidebar states
          isDiscussionOpen={isDiscussionOpen}
          onToggleDiscussion={toggleDiscussion}
          isAIOpen={isAIOpen}
          onToggleAI={toggleAI}
          // Vision sync (暂时关闭)
          visionSync={false}
          // Block-level comment
          onCommentBlock={handleCommentBlock}
          onLangSwitch={handleLangSwitch}
        />
      </main>

      {/* ============================================ */}
      {/* 3. RIGHT SIDEBAR - Unified Panel             */}
      {/* Both AI and Discussion are layout shifters  */}
      {/* ============================================ */}
      <aside 
        className={`
          fixed right-0 top-0 bottom-0 w-[480px]
          bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg
          transition-transform duration-300 ease-in-out
          z-30 flex flex-col print:hidden
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Sidebar Header with Tab Switcher */}
        <div className="shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveSidebar('ai')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                isAIOpen 
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border-blue-500' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent'
              }`}
            >
              <img src="/paipai.jpeg" alt={tChat('name')} className="w-5 h-5 rounded-sm object-cover" />
              {tChat('name')}
            </button>
            <button
              onClick={() => setActiveSidebar('discussion')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                isDiscussionOpen 
                  ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 border-purple-500' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent'
              }`}
            >
              <MessageCircle size={16} />
              {t('discussion')}
            </button>
          </div>
          
          {/* Close Button */}
          <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {isAIOpen
                ? ''
                : activeBlockId
                  ? t('commentingOnBlock')
                  : t('chapterComments')
              }
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={closeSidebar}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title={t('closeSidebar')}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
        


        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {isAIOpen && (
            <ChatBox visionSync={visionSync} lang={lang} />
          )}
          {isDiscussionOpen && (
            <ChapterDiscussion 
              chapterSlug={activeSlug}
              chapterTitle={chapterData.title}
              onClose={closeSidebar}
              activeBlockId={activeBlockId}
              onClearBlockId={clearBlockId}
            />
          )}
        </div>
      </aside>

      {/* ============================================ */}
      {/* 4. FLOATING BUTTON (when sidebar is closed) */}
      {/* ============================================ */}
      {!isSidebarOpen && (
        <button
          onClick={toggleAI}
          className="fixed bottom-6 right-6 z-40 p-0 bg-white border-2 border-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group print:hidden w-16 h-16 overflow-hidden"
        >
          <img src="/paipai.jpeg" alt={tChat('name')} className="w-full h-full object-cover" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {t('chatWithPie')}
          </span>
        </button>
      )}

      <WelcomeModal />
    </div>
  )
}
