'use client'

import dynamic from 'next/dynamic'

// 审核后台依赖客户端的 LanguageContext + NextIntlClientProvider 注入 locale，
// 用 ssr:false 仅在客户端渲染，避免构建期静态预渲染时缺少语言上下文
// 而触发 next-intl 的 ENVIRONMENT_FALLBACK。
const AdminClient = dynamic(() => import('./AdminClient'), { ssr: false })

export default function AdminPage() {
  return <AdminClient />
}
