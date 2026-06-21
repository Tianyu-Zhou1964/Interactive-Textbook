'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { AuthButton } from '@/components/auth/AuthButton'
import { Check, X, Loader2, RefreshCw, ShieldAlert } from 'lucide-react'

interface Suggestion {
  id: string
  block_id: string
  suggested_content: string
  reason: string
  user_id: string
  status: string
  created_at: string
  block_type: string | null
  original_content: string | null
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/suggestions?status=pending')
      if (res.status === 403) throw new Error('无权限：当前账号不是管理员。')
      if (res.status === 401) throw new Error('未登录或登录已失效。')
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || `加载失败 (${res.status})`)
      }
      const data = await res.json()
      setItems(data.suggestions || [])
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setActing(id)
    setError(null)
    try {
      const res = await authFetch(`/suggestions/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || `操作失败 (${res.status})`)
      }
      // 成功后从列表移除
      setItems((prev) => prev.filter((s) => s.id !== id))
    } catch (e: any) {
      setError(e.message || '操作失败')
    } finally {
      setActing(null)
    }
  }

  // 未登录
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-950">
        <ShieldAlert size={48} className="text-amber-500" />
        <p className="text-gray-600 dark:text-gray-300">请先登录以访问审核后台</p>
        <AuthButton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">编辑建议审核</h1>
            <p className="text-sm text-gray-500">待处理的内容修改建议</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
            </button>
            <AuthButton />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Check size={40} className="mx-auto mb-3 text-green-400" />
            没有待审核的建议 🎉
          </div>
        ) : (
          <div className="space-y-5">
            {items.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
              >
                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="text-xs text-gray-500 space-x-3">
                    <span className="font-mono">block {s.block_id?.substring(0, 8)}…</span>
                    {s.block_type && <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">{s.block_type}</span>}
                    <span>提交者 {s.user_id?.substring(0, 8)}…</span>
                    <span>{s.created_at ? new Date(s.created_at).toLocaleString('zh-CN') : ''}</span>
                  </div>
                </div>

                {/* Reason */}
                <div className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-gray-500">理由：</span>
                  {s.reason || '（无）'}
                </div>

                {/* Diff: original vs suggested */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800">
                  <div className="bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs font-medium text-gray-400 mb-2">当前原文</div>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-gray-600 dark:text-gray-400 max-h-72 overflow-y-auto">
                      {s.original_content ?? '（无法读取原文）'}
                    </pre>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-4">
                    <div className="text-xs font-medium text-green-500 mb-2">建议内容</div>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200 max-h-72 overflow-y-auto">
                      {s.suggested_content}
                    </pre>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-3 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => act(s.id, 'reject')}
                    disabled={acting === s.id}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    <X size={15} /> 驳回
                  </button>
                  <button
                    onClick={() => act(s.id, 'approve')}
                    disabled={acting === s.id}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
                  >
                    {acting === s.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 批准并写回
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
