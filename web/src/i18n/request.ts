import { getRequestConfig } from 'next-intl/server'
import zhMessages from '../../messages/zh.json'

// 本项目的实际 locale 由客户端 LanguageContext 决定，并通过 Providers.tsx 里的
// NextIntlClientProvider 注入（无路由前缀方案，见项目指南 i18n 部分）。
// 这里只为「服务端渲染 / 构建期预渲染」提供一份默认兜底配置（默认中文），
// 否则 next-intl 在 SSR 阶段找不到环境配置会抛 ENVIRONMENT_FALLBACK。
// 客户端水合后会以用户实际选择的语言覆盖。
export default getRequestConfig(async () => ({
  locale: 'zh',
  messages: zhMessages,
  // 配置默认时区，避免服务端/客户端环境差异导致的 next-intl 警告与 markup 不一致
  timeZone: 'Asia/Shanghai'
}))
