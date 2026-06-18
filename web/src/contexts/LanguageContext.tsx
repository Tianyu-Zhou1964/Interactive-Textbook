// lang 优先级：URL ?lang= > localStorage > 默认 'zh'
// 修改语言后需要重新 fetch TOC，见 TextbookPlatform.tsx

'use client'
import { createContext, useContext, useState, useEffect } from 'react'

type Lang = 'zh' | 'en'

const LanguageContext = createContext<{
  lang: Lang
  setLang: (l: Lang) => void
  /** 切换语言：持久化后整页跳转，让服务端用新语言重新拉取整本书的数据。 */
  switchLang: (l: Lang) => void
}>({ lang: 'zh', setLang: () => {}, switchLang: () => {} })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlLang = params.get('lang') as Lang
    if (urlLang === 'zh' || urlLang === 'en') {
      setLangState(urlLang)
      localStorage.setItem('passionie_lang', urlLang)
      return
    }
    const saved = localStorage.getItem('passionie_lang') as Lang
    if (saved === 'zh' || saved === 'en') setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    localStorage.setItem('passionie_lang', l)
    setLangState(l)
  }

  // 切换语言会换掉整本书（目录 + 所有章节），用整页跳转交给服务端重新拉数据，
  // 比客户端手动重新 fetch 更简单可靠。WelcomeModal 与顶栏切换按钮共用此逻辑。
  // 打 lang_switching 标记，让跳转后的 WelcomeModal 知道这是一次切语言、不要再弹窗。
  const switchLang = (l: Lang) => {
    localStorage.setItem('passionie_lang', l)
    sessionStorage.setItem('lang_switching', '1')
    window.location.href = `/?lang=${l}`
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, switchLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)