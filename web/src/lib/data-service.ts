/**
 * Data Service for Supabase
 * 
 * Fetches textbook data from the new schema:
 * books -> sections -> content_blocks
 */

import { supabase } from './supabase/client'

// ✅ 修改 1：将超时从 10秒 延长到 60秒，适应国内网络环境
const DATA_FETCH_TIMEOUT_MS = 60_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`[data-service] ${label} timeout after ${ms}ms`)), ms)
  )
  return Promise.race([promise, timeout])
}

// ============ Types ============

export interface Section {
  id: string
  title: string
  slug: string
  order_index: number
  bookId: string
}

export interface ContentBlock {
  id: string
  type: 'markdown' | 'code'
  content: string
  order_index: number
}

export interface ChapterData {
  title: string
  sectionId: string
  blocks: ContentBlock[]
}

// ============ Data Fetching Functions ============

/**
 * Fetches the Table of Contents (list of sections) for a book.
 * If no bookId is provided, uses the first book in the database.
 */
export async function getTableOfContents(lang: 'zh' | 'en' = 'zh'): Promise<Section[]> {
  const client = supabase
  // 检查 supabase 实例是否存在
  if (!client) {
    console.error('[data-service] Supabase client is null. Check .env.local variables.')
    return []
  }

  try {
    const work = async () => {
      const { data: books, error: bookError } = await client
        .from('books')
        .select('id')
        .eq('language', lang)
        .single()
      
      if (bookError || !books) {
        console.error('[data-service] Failed to fetch book:', bookError?.message)
        return []
      }

      const targetBookId = books.id

      // Fetch all sections for this book
      const { data: sections, error } = await client
        .from('sections')
        .select('id, title, slug, order_index')
        .eq('book_id', targetBookId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('[data-service] Error fetching sections:', error.message)
        return []
      }

      return (sections || []).map(s => ({ ...s, bookId: targetBookId }))
    }

    // 执行带超时的请求
    return await withTimeout(work(), DATA_FETCH_TIMEOUT_MS, 'getTableOfContents')

  } catch (e: any) {
    console.error(`[data-service] getTableOfContents failed: ${e.message}`)
    return []
  }
}

/**
 * Fetches the content blocks for a specific chapter by slug.
 * Returns the section title and ordered blocks.
 */
export async function getChapterContent(slug: string, bookId?: string): Promise<ChapterData | null> {
  const client = supabase
  if (!client) return null
  
  try {
    const work = async () => {
      // 1. Get Section info
      let sectionQuery = client
        .from('sections')
        .select('id, title')
        .eq('slug', slug)
      if (bookId) sectionQuery = sectionQuery.eq('book_id', bookId)
      const { data: section, error: sectionError } = await sectionQuery.single()

      if (sectionError || !section) {
        console.warn(`[data-service] Section not found for slug "${slug}":`, sectionError?.message)
        return null
      }

      // 2. Get Content Blocks
      const { data: blocks, error: blocksError } = await client
        .from('content_blocks')
        .select('id, type, content, order_index')
        .eq('section_id', section.id)
        .eq('status', 'official')
        .order('order_index', { ascending: true })

      if (blocksError) {
        console.error('[data-service] Error fetching content blocks:', blocksError.message)
        return { title: section.title, sectionId: section.id, blocks: [] }
      }

      return {
        title: section.title,
        sectionId: section.id,
        blocks: (blocks || []) as ContentBlock[]
      }
    }

    return await withTimeout(work(), DATA_FETCH_TIMEOUT_MS, 'getChapterContent')

  } catch (e: any) {
    console.error(`[data-service] getChapterContent failed: ${e.message}`)
    return null
  }
}
