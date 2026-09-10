import { KnowledgeChunk } from '../types';

/**
 * 运维与 DevOps 领域权威知识卡
 */
export const DEVOPS_CHUNKS: KnowledgeChunk[] = [
  {
    chunkId: 'devops_docker_multistage_01',
    domain: 'devops',
    title: 'Node.js / Go 应用 Dockerfile 多阶段极速构建瘦身与安全加固',
    language: 'dockerfile',
    frameworkVersion: 'Docker 20.10+',
    keywords: [
      'docker',
      'dockerfile',
      '多阶段构建',
      'multistage',
      '镜像瘦身',
      'alpine',
      'non-root',
      '容器安全',
    ],
    apiContract:
      '必须使用 AS builder 划分编译阶段与运行阶段，最终镜像基于 alpine 或 distroless，拷贝编译产物，使用 USER 切换非 root 运行账号。',
    skeletonTemplate: `# 阶段 1: 依赖构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# 阶段 2: 纯净运行镜像 (仅 ~60MB)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 创建非 root 安全账号
RUN addgroup --system --gid 1001 nodejs && \\
    adduser --system --uid 1001 appuser
USER appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/main.js"]`,
    mustHaveFeatures: ['AS builder', 'FROM node:20-alpine', 'USER', 'COPY --from=builder'],
    pitfalls:
      '1. 直接在单阶段中包含构建工具（gcc、make、devDependencies），会导致镜像体积从 80MB 暴涨至 1.2GB；2. 以默认 root 账号运行容器存在主机逃逸安全隐患。',
    sourceAuthority: 'Docker 官方最佳实践指南：Multi-stage builds',
  },
  {
    chunkId: 'devops_k8s_probes_02',
    domain: 'devops',
    title: 'Kubernetes Pod 健康探针：Liveness 与 Readiness 生产标准配置',
    language: 'yaml',
    frameworkVersion: 'Kubernetes 1.22+',
    keywords: [
      'k8s',
      'kubernetes',
      'livenessProbe',
      'readinessProbe',
      '探针',
      '存活探针',
      '就绪探针',
      'pod 重启',
    ],
    apiContract:
      '必须清晰区分 liveness（失败则重启容器）与 readiness（失败则剔除 Service 流量）的不同职责，配置合理的 initialDelaySeconds 与 failureThreshold。',
    skeletonTemplate: `spec:
  containers:
  - name: my-service
    image: my-service:v1.0.0
    ports:
    - containerPort: 8080
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
      failureThreshold: 3
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 20
      failureThreshold: 5`,
    mustHaveFeatures: ['livenessProbe', 'readinessProbe', 'initialDelaySeconds', 'periodSeconds'],
    pitfalls:
      '严禁将 livenessProbe 指向需要依赖第三方（如数据库、下游 API）的健康检测接口，否则一旦数据库波动，会导致集群内部所有 Pod 发生连锁恐慌性重启（雪崩）。',
    sourceAuthority: 'Kubernetes Production Best Practices: Probes',
  },
  {
    chunkId: 'devops_nginx_cors_websocket_03',
    domain: 'devops',
    title: 'Nginx 高性能反向代理、CORS 跨域与 WebSocket 协议升级配置',
    language: 'nginx',
    frameworkVersion: 'Nginx 1.18+',
    keywords: [
      'nginx',
      '反向代理',
      'proxy_pass',
      'CORS',
      '跨域',
      'websocket',
      'Upgrade',
      'Connection',
    ],
    apiContract:
      '必须正确配置 Host、X-Real-IP、X-Forwarded-For 真实透传，配置 proxy_set_header Upgrade 与 Connection 支撑 WebSocket 双向长连接，处理 OPTIONS 预检请求。',
    skeletonTemplate: `server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_pass http://127.0.0.1:8080;
        proxy_read_timeout 300s;
    }
}`,
    mustHaveFeatures: ['proxy_pass', 'proxy_set_header Host', 'Upgrade', 'Connection'],
    pitfalls:
      '缺少 proxy_http_version 1.1 会导致 WebSocket 握手以 HTTP/1.0 模式通信，直接导致升级协议握手失败（101 Switching Protocols 异常）。',
    sourceAuthority: 'Nginx Documentation: Reverse Proxy & WebSocket',
  },
  {
    chunkId: 'devops_github_actions_ci_04',
    domain: 'devops',
    title: 'GitHub Actions 生产级 CI/CD 流水线：自动测试、构建与 Docker 推送',
    language: 'yaml',
    frameworkVersion: 'GitHub Actions v4',
    keywords: [
      'github actions',
      'ci/cd',
      '流水线',
      'workflow',
      'docker push',
      '自动化部署',
      'secrets',
    ],
    apiContract:
      '必须配置 on: push / pull_request 触发条件，拆分 test 与 build-and-push 两个串行 job，利用 docker/build-push-action 与 GitHub Secrets 安全鉴权。',
    skeletonTemplate: `name: CI/CD Pipeline

on:
  push:
    branches: [ "main" ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKER_USER }}
          password: \${{ secrets.DOCKER_PASSWORD }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: myorg/myapp:\${{ github.sha }}`,
    mustHaveFeatures: ['runs-on', 'actions/checkout', 'secrets', 'docker/build-push-action'],
    pitfalls:
      '切勿在同一个 job 甚至同一个 step 里把 build 和 push 和 test 强行写死，一旦测试失败容器镜像依然会被推送到远端 Harbor/DockerHub 造成污染。',
    sourceAuthority: 'GitHub Actions Official Documentation: Building and testing',
  },
  {
    chunkId: 'devops_compose_microservice_05',
    domain: 'devops',
    title: 'Docker Compose 生产编排规范：健康检查与服务启动依赖顺序',
    language: 'yaml',
    frameworkVersion: 'Docker Compose v2',
    keywords: [
      'docker-compose',
      '编排',
      'depends_on',
      'service_healthy',
      'healthcheck',
      'volumes',
      'networks',
    ],
    apiContract:
      '必须使用 depends_on condition: service_healthy 替代简陋的单纯启动依赖，确保 MySQL 或 Redis 端口完全就绪后，后端服务容器才启动启动连接。',
    skeletonTemplate: `version: '3.8'

services:
  database:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - app_net

  backend:
    image: myapp:v1.0
    depends_on:
      database:
        condition: service_healthy # 关键：数据库通过健康检测后才拉起后端
    ports:
      - "8080:8080"
    networks:
      - app_net

volumes:
  db_data:

networks:
  app_net:
    driver: bridge`,
    mustHaveFeatures: ['service_healthy', 'healthcheck', 'depends_on', 'networks'],
    pitfalls:
      '标准的 depends_on 仅仅等待容器进程开始运行，并不知道数据库里的 Socket 和密码是否初始化完成，经常导致后端启动瞬间连库超时闪退崩溃。',
    sourceAuthority: 'Docker Compose File Specification: depends_on condition',
  },
  {
    chunkId: 'devops_linux_high_load_debug_06',
    domain: 'devops',
    title: 'Linux 生产服务器 CPU 100% 满载与内存爆满根因排查命令流',
    language: 'bash',
    frameworkVersion: 'Linux / POSIX',
    keywords: [
      'linux',
      'cpu 100%',
      '内存爆满',
      'top',
      'pidstat',
      'oom-killer',
      'dmesg',
      '排障',
      'perf',
    ],
    apiContract:
      '必须给出从整体系统视角（top/uptime）到具体进程（top -c）、线程级定位（top -Hp pid 或 pidstat -t）以及通过 jstack/perf 采样抓出死循环代码行的闭环流程。',
    skeletonTemplate: `# 1. 查看系统整体负载与各核心占用 (按 'P' 按 CPU 排序，按 'M' 按内存排序)
top -c

# 2. 找到占用最高的进程 PID 后，精准查看该进程内哪个线程号(TID)在跑死循环
top -Hp <PID>

# 3. 将消耗最大的十进制 TID 转换为十六进制 (如 28990 -> 0x713e)
printf "%x\\n" <TID>

# 4. 如果是 Java 应用，直接从堆栈抓出死循环代码行号
jstack <PID> | grep "0x713e" -A 30

# 5. 如果是 C++/Go/Node 应用，使用 perf 采样输出火焰图
perf top -p <PID>

# 6. 检查是否发生过系统 OOM Killer 强杀进程
dmesg -T | grep -i oom`,
    mustHaveFeatures: ['top -Hp', 'printf "%x\\n"', 'perf', 'dmesg'],
    pitfalls:
      '看到 CPU 高就盲目重启服务器治标不治本，必须先在生产现场通过 top -Hp 抓出 TID 并执行快照保存（现场证据保留），才能彻底根治死循环或高并发阻塞。',
    sourceAuthority: 'Brendan Gregg: Systems Performance: Enterprise and the Cloud',
  },
];
