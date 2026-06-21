import createNextIntlPlugin from 'next-intl/plugin'

// 指向服务端兜底配置（实际 locale 仍由客户端 LanguageContext 决定）
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/py/:path*', // 当前端请求 /py/xxx 时
        destination: 'http://127.0.0.1:8000/:path*', // 转发给 Python 后端
      },
    ]
  },
};

export default withNextIntl(nextConfig);