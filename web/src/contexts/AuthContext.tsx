'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  /** 发送魔法链接到邮箱。返回 error 信息（成功为 null）。 */
  signInWithEmail: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
  /** 取当前 access token，用于给后端请求带 Authorization 头。 */
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // 初始读取已有 session（来自 localStorage 或魔法链接回跳）
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // 订阅登录态变化（登录/登出/token 刷新）
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signInWithEmail = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return 'Supabase 未配置（缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY）'
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // 点击邮件里的链接后回跳到当前站点
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
    return error ? error.message : null
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const value: AuthContextType = { user, session, loading, signInWithEmail, signOut, getToken }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
