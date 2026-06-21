'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { MessageCircle, BookOpen, Loader2, Download } from 'lucide-react'
import { ContentBlock } from '@/lib/data-service'
import { filterBlocksForPyTorch } from '@/lib/block-filter'
import { SuggestionModal } from '@/components/ui/SuggestionModal'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { AuthButton } from '@/components/auth/AuthButton'
import { BlockContainer } from '@/components/content/blocks/BlockContainer'
import { JupyterCodeCell } from '@/components/content/blocks/JupyterCodeCell'
import { MarkdownCell } from '@/components/content/blocks/MarkdownCell'
import { BlockEditor } from '@/components/content/blocks/BlockEditor'

// API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface MainContentProps {
  chapterTitle: string
  lang?: 'zh' | 'en'
  onLangSwitch: () => void
  sectionId?: string // Section ID for creating new blocks
  blocks: ContentBlock[]
  isLoading?: boolean
  // Discussion Panel (layout shifter)
  isDiscussionOpen: boolean
  onToggleDiscussion: () => void
  // AI Panel
  isAIOpen: boolean
  onToggleAI: () => void
  // Vision sync (暂时关闭)
  visionSync?: boolean
  // Block-level comment callback
  onCommentBlock?: (blockId: string) => void
}

// =====================================================
// LOCAL BLOCK TYPE (for added blocks)
// =====================================================
interface LocalBlock {
  id: string
  type: 'code' | 'markdown'
  content: string
  isNew: boolean
}

// =====================================================
// MAIN CONTENT COMPONENT
// =====================================================
export function MainContent({ 
  chapterTitle,
  lang = 'zh',
  blocks, 
  isLoading = false,
  sectionId,
  isDiscussionOpen,
  onToggleDiscussion,
  isAIOpen,
  onToggleAI,
  visionSync = false,
  onCommentBlock,
  onLangSwitch
}: MainContentProps) {
  const t = useTranslations('mainContent')
  // Local blocks state (includes both DB blocks and newly added ones)
  const [localBlocks, setLocalBlocks] = useState<LocalBlock[]>([])
  
  // Track which block is currently being edited
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  
  // Suggestion Modal State
  const [suggestionModal, setSuggestionModal] = useState<{
    isOpen: boolean
    blockId: string
    blockType: 'code' | 'markdown'
    originalContent: string
    newContent: string
  } | null>(null)
  
  // 评论数量缓存
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  const blocksHash = useMemo(() => {
    return blocks?.map(b => b.id).join(',') || ''
  }, [blocks])

  // Initialize local blocks from props when blocks change
  // Apply PyTorch filter to only show PyTorch-compatible code blocks
  useEffect(() => {
    if (blocks && blocks.length > 0) {
      const pyTorchOnlyBlocks = filterBlocksForPyTorch(blocks);
      
      setLocalBlocks(pyTorchOnlyBlocks.map(b => ({
        id: b.id,
        type: b.type as 'code' | 'markdown',
        content: b.content,
        isNew: false
      })))

      // 获取评论数量
      const blockIds = pyTorchOnlyBlocks.map(b => b.id)
      fetch(`${API_URL}/comments/counts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_ids: blockIds })
      })
        .then(res => res.json())
        .then(data => {
          if (data.counts) setCommentCounts(data.counts)
        })
        .catch(e => console.warn('[MainContent] Failed to load comment counts:', e))
    }
  }, [blocksHash, chapterTitle])

  // Add new code block after a specific index
  const handleAddCodeBelow = useCallback(async (afterIndex: number) => {
    const defaultContent = '```python\n# New code block\nprint("Hello, World!")\n```'
    
    // If we have a section ID, create the block in the database
    if (sectionId) {
      try {
        const response = await fetch(`${API_URL}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section_id: sectionId,
            type: 'code',
            content: defaultContent,
            order_index: afterIndex + 1
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          // Use the real UUID from the database
          const newBlock: LocalBlock = {
            id: data.id, // Real UUID!
            type: 'code',
            content: defaultContent,
            isNew: true
          }
          
          setLocalBlocks(prev => {
            const updated = [...prev]
            updated.splice(afterIndex + 1, 0, newBlock)
            return updated
          })
          
          setEditingBlockId(data.id)
          return
        } else {
          console.error('[MainContent] Failed to create block in DB')
        }
      } catch (e) {
        console.error('[MainContent] Error creating block:', e)
      }
    }
    
    // Fallback: create local-only block (won't work with comments/suggestions)
    const newBlockId = `new-${Date.now()}`
    const newBlock: LocalBlock = {
      id: newBlockId,
      type: 'code',
      content: defaultContent,
      isNew: true
    }
    
    setLocalBlocks(prev => {
      const updated = [...prev]
      updated.splice(afterIndex + 1, 0, newBlock)
      return updated
    })
    
    setEditingBlockId(newBlockId)
  }, [sectionId])

  // Delete a local block
  const handleDeleteBlock = useCallback((blockId: string) => {
    setLocalBlocks(prev => prev.filter(b => b.id !== blockId))
  }, [])

  // Handle comment on block
  const handleCommentBlock = useCallback((blockId: string) => {
    // onCommentBlock will set activeBlockId and open the discussion sidebar
    onCommentBlock?.(blockId)
  }, [onCommentBlock])

  // Open suggestion modal (replaces window.prompt)
  const handleSubmitSuggestion = useCallback((blockId: string, newContent: string) => {
    // Find the block to get its type and original content
    const block = localBlocks.find(b => b.id === blockId)
    if (!block) return

    // Open the modal
    setSuggestionModal({
      isOpen: true,
      blockId,
      blockType: block.type,
      originalContent: block.content,
      newContent
    })
  }, [localBlocks])

  // Handle modal success
  const handleSuggestionSuccess = useCallback(() => {
    if (!suggestionModal) return

    // Optimistic update - update local content
    setLocalBlocks(prev => prev.map(b => 
      b.id === suggestionModal.blockId ? { ...b, content: suggestionModal.newContent } : b
    ))

    // Close modal and exit edit mode
    setSuggestionModal(null)
    setEditingBlockId(null)
  }, [suggestionModal])

  // Close suggestion modal
  const closeSuggestionModal = useCallback(() => {
    setSuggestionModal(null)
    // Keep editing mode open so user can continue editing
  }, [])

  // Use local blocks for display if available, otherwise fallback (though effect handles this)
  const displayBlocks = localBlocks.length > 0 ? localBlocks : []
  
  // Count code cells for numbering
  let codeCellIndex = 0

  const handleDownloadPDF = () => {
    const originalTitle = document.title
    // Set title exactly as requested for filename
    document.title = `${chapterTitle}作者阡陌交通_ 抖音主页https://v.douyin.com/XZWeuSl-IIY/`
    
    // Small delay to ensure browser picks up the title change
    setTimeout(() => {
      window.print()
      // Restore original title
      document.title = originalTitle
    }, 150)
  }

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-all duration-300">
      {/* ===== PRINT WATERMARK (Fixed Overlay) ===== */}
      <div className="hidden print:block fixed inset-0 z-[9999] pointer-events-none overflow-hidden opacity-[0.05]">
        <div className="flex flex-wrap gap-x-20 gap-y-32 rotate-[-25deg] scale-150 origin-center justify-around items-center w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="text-black text-[12px] leading-relaxed whitespace-nowrap text-center">
              作者阡陌交通_ 抖音主页https://v.douyin.com/XZWeuSl-IIY/
              <br />
              教材发布和讨论:passionie.uk
            </div>
          ))}
        </div>
      </div>

      {/* ===== TOP TOOLBAR ===== */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm print:hidden">
        {/* Left: Branding / Breadcrumb */}
        <div className="flex items-center gap-2 shrink-0">
           <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
             <BookOpen size={20} />
           </div>
           <span className="font-semibold text-gray-800 dark:text-gray-200 hidden sm:block">{t('bookTitle')}</span>
           <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-md border border-amber-200/50 dark:border-amber-800/50 whitespace-nowrap">{t('beta')}</span>
        </div>

        {/* Center: Title（进入 flex 流并可收缩 truncate，避免面板打开后压窄时与左右按钮重叠） */}
        <div className="flex-1 min-w-0 justify-center px-4 hidden lg:flex">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 px-4 py-1.5 rounded-full shadow-sm max-w-[300px] truncate border border-gray-100 dark:border-gray-700">
            {chapterTitle}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* AI Assistant Button (派派) */}
          <button
            onClick={onToggleAI}
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
              isAIOpen 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title={t('assistant')}
          >
            <img src="/paipai.jpeg" alt={t('assistant')} className="w-5 h-5 rounded-sm object-cover" />
            <span className="hidden lg:inline">{t('assistant')}</span>
          </button>

          {/* Discussion Button */}
          <button
            onClick={onToggleDiscussion}
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-all border relative ${
              isDiscussionOpen 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title={t('discussionTitle')}
          >
            <MessageCircle size={18} />
            <span className="hidden lg:inline">{t('discussion')}</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            title={t('downloadPDFTitle')}
          >
            <Download size={18} />
            <span className="hidden lg:inline">{t('downloadPDF')}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onLangSwitch}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            title={t('switchLang')}
          >
            <span>{lang === 'zh' ? 'EN' : '中'}</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* 登录 / 登出 */}
          <AuthButton />
        </div>
      </div>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div id="main-content-area" className="max-w-4xl mx-auto p-4 md:p-6 lg:p-10 pr-16">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              <span className="text-gray-500 dark:text-gray-400 font-medium">{t('loadingChapter')}</span>
            </div>
          </div>
        ) : (
          /* ===== JUPYTER-STYLE RENDERING ===== */
          <div id="chapter-content" className="bg-white dark:bg-gray-900 p-6 md:p-8 lg:p-12 rounded-2xl shadow-lg min-h-[80vh] border border-gray-100 dark:border-gray-800">
            {/* Chapter Header */}
            <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{chapterTitle}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('cellsSummary', { cells: displayBlocks.length, code: displayBlocks.filter(b => b.type === 'code').length })}
              </p>
            </div>
            
            {/* Render blocks */}
            <div className="jupyter-notebook space-y-2">
              {displayBlocks.map((block, index) => {
                const isCodeBlock = block.type === 'code'
                const currentCellIndex = isCodeBlock ? codeCellIndex++ : -1
                const isEditing = editingBlockId === block.id

                // If editing, show Editor Component
                if (isEditing) {
                  return (
                    <BlockEditor 
                      key={block.id}
                      content={block.content}
                      type={block.type}
                      onCancel={() => setEditingBlockId(null)}
                      onSubmit={(newContent) => handleSubmitSuggestion(block.id, newContent)}
                    />
                  )
                }
                
                // Normal View (Wrapped in BlockContainer)
                return (
                  <BlockContainer
                    key={block.id}
                    blockId={block.id}
                    blockIndex={index}
                    commentCount={commentCounts[block.id] || 0}
                    onAddCodeBelow={handleAddCodeBelow}
                    onComment={handleCommentBlock}
                    onEdit={(id) => setEditingBlockId(id)}
                  >
                    {isCodeBlock ? (
                      <JupyterCodeCell 
                        content={block.content} 
                        cellIndex={currentCellIndex}
                        isInteractive={block.isNew}
                        onDelete={block.isNew ? () => handleDeleteBlock(block.id) : undefined}
                      />
                    ) : (
                      <MarkdownCell content={block.content} />
                    )}
                  </BlockContainer>
                )
              })}
            </div>
            
            {displayBlocks.length === 0 && (
              <div className="text-center text-gray-400 dark:text-gray-500 py-20">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('noContent')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestion Modal */}
      {suggestionModal && (
        <SuggestionModal
          isOpen={suggestionModal.isOpen}
          onClose={closeSuggestionModal}
          blockId={suggestionModal.blockId}
          blockType={suggestionModal.blockType}
          originalContent={suggestionModal.originalContent}
          newContent={suggestionModal.newContent}
          onSuccess={handleSuggestionSuccess}
        />
      )}

    </div>
  )
}
