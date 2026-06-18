# 使用官方 Node 镜像加速地址 (华为云镜像库示例)
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/node:20-alpine AS builder
WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package*.json ./

# 配置 npm 使用淘宝镜像源加速
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

# 复制源代码
COPY . .

# 设置构建环境变量 (生产环境 URL)
ARG NEXT_PUBLIC_API_URL=https://api.passionie.uk
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# 构建项目
RUN npm run build

# 使用更小的镜像运行应用
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# 复制构建后的产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
