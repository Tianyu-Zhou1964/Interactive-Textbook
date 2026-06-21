'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_URL, authFetch } from '@/lib/api'
import { MessageCircle, Send, X, Clock, ThumbsUp, Reply, ChevronDown, ArrowLeft, Loader2 } from 'lucide-react'

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
  likes: number
  replies?: Comment[]
  blockId?: string | null
}

interface CommentCardProps {
  comment: Comment
  isReply?: boolean
}

function CommentCard({ comment, isReply = false }: CommentCardProps) {
  const [showReplies, setShowReplies] = useState(true)
  const [liked, setLiked] = useState(false)
  
  return (
    <div className={`${isReply ? 'ml-6 mt-3' : ''}`}>
      <div className={`p-4 rounded-xl transition-all ${
        isReply 
          ? 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700' 
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${
            isReply 
              ? 'bg-gradient-to-br from-emerald-400 to-teal-500' 
              : 'bg-gradient-to-br from-blue-400 to-indigo-500'
          }`}>
            {comment.author[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1">
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{comment.author}</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <Clock size={10} />
              {comment.timestamp}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">{comment.content}</p>
        
        {/* Actions */}
        <div className="flex items-center gap-4 text-xs">
          <button 
            onClick={() => setLiked(!liked)}
            className={`flex items-center gap-1 transition-colors ${
              liked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
            }`}
          >
            <ThumbsUp size={12} fill={liked ? 'currentColor' : 'none'} />
            {comment.likes + (liked ? 1 : 0)}
          </button>
          <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors">
            <Reply size={12} />
            回复
          </button>
        </div>
      </div>
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 border-l-2 border-blue-100 dark:border-blue-900">
          <button 
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 ml-4 mb-2 flex items-center gap-1"
          >
            <ChevronDown size={12} className={`transition-transform ${showReplies ? 'rotate-180' : ''}`} />
            {showReplies ? '收起' : '展开'} {comment.replies.length} 条回复
          </button>
          {showReplies && comment.replies.map(reply => (
            <CommentCard key={reply.id} comment={reply} isReply />
          ))}
        </div>
      )}
    </div>
  )
}

interface ChapterDiscussionProps {
  chapterSlug: string
  chapterTitle: string
  onClose: () => void
  activeBlockId?: string | null
  onClearBlockId?: () => void
}

export function ChapterDiscussion({ 
  chapterSlug, 
  chapterTitle, 
  onClose, 
  activeBlockId,
  onClearBlockId 
}: ChapterDiscussionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 从 API 获取评论（block 级别或 chapter 级别均走真实数据）
  const fetchComments = useCallback(async () => {
    if (!activeBlockId) {
      // 没有选中 block 时，提示用户点击具体块
      setComments([])
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_URL}/comments?block_id=${encodeURIComponent(activeBlockId)}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || '获取评论失败')
      }
      
      const data = await response.json()
      
      if (data.comments && Array.isArray(data.comments) && data.comments.length > 0) {
        const apiComments: Comment[] = data.comments.map((c: any) => ({
          id: c.id,
          author: c.user_id || '匿名用户',
          content: c.content,
          timestamp: c.created_at ? new Date(c.created_at).toLocaleString('zh-CN') : '未知时间',
          likes: 0,
          blockId: c.block_id
        }))
        setComments(apiComments)
      } else {
        setComments([])
      }
    } catch (e: any) {
      console.error('[ChapterDiscussion] Fetch error:', e)
      setError(e.message || '加载评论失败')
      setComments([])
    } finally {
      setIsLoading(false)
    }
  }, [activeBlockId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // 发表评论
  const handlePost = async () => {
    if (!newComment.trim()) return
    
    setIsPosting(true)
    
    if (!activeBlockId) {
      setError('请先选择一个代码块进行评论')
      setIsPosting(false)
      return
    }

    try {
      // 评论允许匿名；若已登录，authFetch 会带上 token，后端据此填真实 user_id
      const response = await authFetch(`/comments`, {
        method: 'POST',
        body: JSON.stringify({
          block_id: activeBlockId,
          content: newComment.trim(),
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || '发送评论失败')
      }
      
      const data = await response.json()
      
      const comment: Comment = {
        id: data.id || `new-${Date.now()}`,
        author: data.user_id || '我',
        content: data.content || newComment,
        timestamp: data.created_at ? new Date(data.created_at).toLocaleString('zh-CN') : '刚刚',
        likes: 0,
        blockId: activeBlockId
      }
      setComments([comment, ...comments])
      setNewComment('')
      setError(null)
    } catch (e: any) {
      console.error('[ChapterDiscussion] Post error:', e)
      setError(e.message || '发送评论失败')
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <MessageCircle size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {activeBlockId ? '区块评论' : '章节讨论'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{chapterTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full font-medium">
            {comments.length} 条评论
          </span>
          <span>•</span>
          <span>{activeBlockId ? '区块讨论' : '请选择一个内容块'}</span>
        </div>

        {/* Block Focus Indicator with Back Button */}
        {activeBlockId && (
          <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  仅显示选中区块的评论
                </p>
              </div>
              {onClearBlockId && (
                <button
                  onClick={onClearBlockId}
                  className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium transition-colors"
                >
                  <ArrowLeft size={12} />
                  返回
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-purple-500" />
          </div>
        )}

        {!isLoading && !activeBlockId && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <MessageCircle size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">请点击内容块右侧的评论按钮</p>
            <p className="text-xs mt-1">即可查看和发表该区块的评论</p>
          </div>
        )}

        {!isLoading && activeBlockId && comments.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <MessageCircle size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">暂无评论</p>
            <p className="text-xs mt-1">成为第一个发言的人吧！</p>
          </div>
        )}

        {!isLoading && comments.map(comment => (
          <CommentCard key={comment.id} comment={comment} />
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0">
        {activeBlockId ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              匿
            </div>
            <div className="flex-1 relative">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePost()}
                placeholder="发表你的看法..."
                disabled={isPosting}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 pr-12 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 dark:focus:ring-purple-900 transition-all disabled:bg-gray-50 dark:disabled:bg-gray-700"
              />
              <button
                onClick={handlePost}
                disabled={!newComment.trim() || isPosting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-purple-600 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors hover:bg-purple-700"
              >
                {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
            点击内容块右侧的评论按钮以添加评论
          </div>
        )}
      </div>
    </div>
  )
}
