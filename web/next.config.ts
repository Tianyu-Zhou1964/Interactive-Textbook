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

export default nextConfig;