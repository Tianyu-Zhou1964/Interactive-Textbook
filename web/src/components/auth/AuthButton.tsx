'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LogIn, LogOut, Mail, Loader2, CheckCircle, X, UserCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function AuthButton() {
  const { user, loading, signInWithEmail, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Portal 只能在客户端挂载后使用
  useEffect(() => setMounted(true), [])

  // 弹窗打开时锁定背景滚动
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  const handleSend = async () => {
    if (!email.trim()) return
    setSending(true)
    setError(null)
    const err = await signInWithEmail(email.trim())
    setSending(false)
    if (err) setError(err)
    else setSent(true)
  }

  const closeModal = () => {
    setOpen(false)
    setSent(false)
    setError(null)
    setEmail('')
  }

  if (loading) {
    return <span className="text-xs text-gray-400">…</span>
  }

  // ===== 已登录：显示用户名 + 登出 =====
  if (user) {
    const displayName = user.email ? user.email.split('@')[0] : '已登录'
    return (
      <div className="flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 max-w-[180px] truncate"
          title={user.email || ''}
        >
          <UserCircle size={16} className="text-indigo-500 shrink-0" />
          {displayName}
        </span>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="登出"
        >
          <LogOut size={13} /> 登出
        </button>
      </div>
    )
  }

  // ===== 未登录：登录按钮 + Portal 弹窗 =====
  const modal = open ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />

      {/* 弹窗本体 */}
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-7 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">登录</h2>
            <p className="text-indigo-100 text-xs mt-0.5">首次使用该邮箱将自动创建账号</p>
          </div>
          <button onClick={closeModal} className="p-1.5 hover:bg-white/20 rounded-full text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-7 space-y-5">
          {sent ? (
            <div className="text-center space-y-3 py-6">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <p className="text-base text-gray-700 dark:text-gray-200">
                登录链接已发送到
                <br />
                <span className="font-semibold">{email}</span>
              </p>
              <p className="text-sm text-gray-400">请打开邮箱点击链接完成登录（也可能在垃圾邮件里）。</p>
              <button
                onClick={closeModal}
                className="mt-2 text-sm text-indigo-500 hover:text-indigo-400"
              >
                知道了
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                输入邮箱，我们会发一封登录链接给你，无需密码。
                <br />
                <span className="text-xs text-gray-400">没有账号？用这个邮箱登录即自动注册。</span>
              </p>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl text-base focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                  disabled={sending}
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleSend}
                disabled={sending || !email.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <><Loader2 size={18} className="animate-spin" /> 发送中…</> : '发送登录链接'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
      >
        <LogIn size={14} /> 登录
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  )
}
