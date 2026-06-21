'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { NextIntlClientProvider } from 'next-intl'
import { PyodideProvider } from '@/contexts/PyodideContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import zhMessages from '../../messages/zh.json'
import enMessages from '../../messages/en.json'

const MESSAGES = { zh: zhMessages, en: enMessages }

interface ProvidersProps {
  children: ReactNode
}

// 语言由现有的 LanguageContext 决定（基于 ?lang= / localStorage），
// 这里把它接到 next-intl 的 Provider，不引入路由前缀。
function IntlProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang()
  return (
    <NextIntlClientProvider locale={lang} messages={MESSAGES[lang]}>
      {children}
    </NextIntlClientProvider>
  )
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <IntlProvider>
        <AuthProvider>
          <PyodideProvider>
            {children}
          </PyodideProvider>
        </AuthProvider>
      </IntlProvider>
    </ThemeProvider>
  )
}
