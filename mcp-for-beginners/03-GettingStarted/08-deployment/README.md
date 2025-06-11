# 08 - MCPサーバーのデプロイメント

## 📖 概要

MCPサーバーを本番環境にデプロイすることは、開発の最終段階であり、実際のユーザーがアクセスできるようにする重要なプロセスです。この章では、様々なデプロイメント戦略、プラットフォーム、およびベストプラクティスについて学習します。

## 🎯 学習目標

この章を完了すると、以下のことができるようになります：

- 様々なデプロイメント戦略を理解できる
- Docker を使用してアプリケーションをコンテナ化できる
- Kubernetes でスケーラブルなデプロイメントを実現できる
- 主要なクラウドプラットフォームにデプロイできる
- CI/CD パイプラインを構築できる
- 監視とログ管理を設定できる

## 🚀 デプロイメント戦略の概要

### デプロイメントパターン

```mermaid
graph TD
    A[開発環境] --> B[ステージング環境]
    B --> C[本番環境]
    
    D[Blue-Green Deploy] --> E[カナリアリリース]
    E --> F[ローリングアップデート]
    
    style A fill:#99ff99
    style B fill:#ffcc99
    style C fill:#ff9999
```

| デプロイメント方法 | メリット | デメリット | 適用場面 |
|-------------------|----------|-----------|----------|
| ブルーグリーン | ゼロダウンタイム | リソース倍必要 | クリティカルサービス |
| カナリアリリース | リスク最小化 | 複雑な監視が必要 | 新機能のテスト |
| ローリングアップデート | リソース効率的 | 部分的な停止期間 | 一般的なアプリケーション |

## 🐳 Docker でのコンテナ化

### Dockerfile の作成

```dockerfile
# Node.js MCPサーバー用Dockerfile
FROM node:18-alpine

# 作業ディレクトリの設定
WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# TypeScriptのビルド
RUN npm run build

# 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

# 権限の変更
USER mcp

# ポートの公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# アプリケーションの起動
CMD ["node", "dist/server/index.js"]
```

### Python MCPサーバー用Dockerfile

```dockerfile
FROM python:3.10-slim

# 作業ディレクトリの設定
WORKDIR /app

# システムの依存関係
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 要件ファイルのコピー
COPY requirements.txt .

# Pythonの依存関係インストール
RUN pip install --no-cache-dir -r requirements.txt

# ソースコードのコピー
COPY . .

# 非rootユーザーの作成
RUN useradd --create-home --shell /bin/bash mcp

# 権限の変更
USER mcp

# ポートの公開
EXPOSE 8000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python healthcheck.py

# アプリケーションの起動
CMD ["python", "src/server.py"]
```

### Docker Compose 設定

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - database
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  database:
    image: postgres:15
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - mcp-server
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### マルチステージビルド

```dockerfile
# マルチステージDockerfile（最適化版）
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:18-alpine AS production

WORKDIR /app

# セキュリティアップデート
RUN apk update && apk upgrade

# 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# 必要なファイルのみコピー
COPY --from=builder --chown=mcp:nodejs /app/dist ./dist
COPY --from=builder --chown=mcp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:nodejs /app/package.json ./

USER mcp

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
```

## ☸️ Kubernetes でのデプロイメント

### Deployment 設定

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
  labels:
    app: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: your-registry/mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: mcp-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      imagePullSecrets:
      - name: registry-secret
```

### Service 設定

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-server-service
spec:
  selector:
    app: mcp-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Ingress 設定

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-server-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: mcp-server-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mcp-server-service
            port:
              number: 80
```

### ConfigMap と Secret

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-secrets
type: Opaque
data:
  database-url: <base64-encoded-database-url>
  redis-url: <base64-encoded-redis-url>
  jwt-secret: <base64-encoded-jwt-secret>
```

## ☁️ クラウドプラットフォームでのデプロイ

### AWS でのデプロイ

#### ECS (Elastic Container Service)

```json
{
  "family": "mcp-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "mcp-server",
      "image": "your-account.dkr.ecr.region.amazonaws.com/mcp-server:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:region:account:parameter/mcp/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mcp-server",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node healthcheck.js"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Lambda でのサーバーレスデプロイ

```javascript
// serverless.yml
service: mcp-server

provider:
  name: aws
  runtime: nodejs18.x
  region: us-west-2
  environment:
    NODE_ENV: production
    DATABASE_URL: ${ssm:/mcp/database-url}

functions:
  mcpServer:
    handler: dist/lambda.handler
    timeout: 30
    memorySize: 512
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true

plugins:
  - serverless-offline
  - serverless-typescript

package:
  exclude:
    - src/**
    - tests/**
    - "*.md"
```

### Google Cloud Platform でのデプロイ

#### Cloud Run

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/mcp-server', '.']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/mcp-server']
  
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'mcp-server'
      - '--image=gcr.io/$PROJECT_ID/mcp-server'
      - '--platform=managed'
      - '--region=us-central1'
      - '--allow-unauthenticated'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--max-instances=10'
      - '--set-env-vars=NODE_ENV=production'
```

### Azure でのデプロイ

#### Container Instances

```yaml
# azure-deploy.yml
apiVersion: 2018-10-01
location: eastus
name: mcp-server
properties:
  containers:
  - name: mcp-server
    properties:
      image: yourregistry.azurecr.io/mcp-server:latest
      ports:
      - port: 3000
        protocol: TCP
      environmentVariables:
      - name: NODE_ENV
        value: production
      - name: DATABASE_URL
        secureValue: <database-connection-string>
      resources:
        requests:
          cpu: 0.5
          memoryInGb: 1
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
    - protocol: tcp
      port: 3000
tags: {}
type: Microsoft.ContainerInstance/containerGroups
```

## 🔄 CI/CD パイプライン

### GitHub Actions でのCI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Build application
      run: npm run build

    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha

    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/deployment.yaml
          k8s/service.yaml
        images: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        kubeconfig: ${{ secrets.KUBECONFIG }}
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm test
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main

deploy:
  stage: deploy
  image: kubectl:latest
  script:
    - kubectl set image deployment/mcp-server mcp-server=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - kubectl rollout status deployment/mcp-server
  environment:
    name: production
    url: https://api.yourdomain.com
  only:
    - main
```

## 📊 監視とログ管理

### Prometheus でのメトリクス収集

```typescript
// src/metrics.ts
import promClient from 'prom-client';

// メトリクス定義
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

export const activeConnections = new promClient.Gauge({
  name: 'mcp_active_connections',
  help: 'Number of active MCP connections'
});

export const toolCallsTotal = new promClient.Counter({
  name: 'mcp_tool_calls_total',
  help: 'Total number of MCP tool calls',
  labelNames: ['tool_name', 'status']
});

// レジストリの設定
promClient.collectDefaultMetrics();
```

### ログ設定

```typescript
// src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mcp-server' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 本番環境では構造化ログを使用
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.json()
  }));
}
```

### ヘルスチェック実装

```typescript
// src/health.ts
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    memory: 'healthy' | 'unhealthy';
  };
}

export async function performHealthCheck(): Promise<HealthCheck> {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: checkMemoryUsage()
  };

  const status = Object.values(checks).every(check => check === 'healthy') 
    ? 'healthy' 
    : 'unhealthy';

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    checks
  };
}
```

## 🔒 セキュリティ設定

### SSL/TLS 証明書

```nginx
# nginx.conf
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://mcp-server:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 環境変数の管理

```bash
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key
LOG_LEVEL=info
METRICS_PORT=9090
```

```typescript
// src/config.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'sqlite:memory:',
    ssl: process.env.NODE_ENV === 'production'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret',
    jwtExpiry: process.env.JWT_EXPIRY || '24h'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// 必須環境変数のチェック
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}
```

## 📈 スケーリング戦略

### 水平スケーリング

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 垂直スケーリング

```yaml
# k8s/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: mcp-server-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-server
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: mcp-server
      maxAllowed:
        cpu: 1
        memory: 2Gi
      minAllowed:
        cpu: 100m
        memory: 128Mi
```

## ✅ デプロイメントのベストプラクティス

### 1. 段階的デプロイメント

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Starting deployment..."

# ヘルスチェック
check_health() {
  local url=$1
  local retries=5
  
  for i in $(seq 1 $retries); do
    if curl -f "$url/health" > /dev/null 2>&1; then
      echo "Health check passed"
      return 0
    fi
    echo "Health check failed, retrying... ($i/$retries)"
    sleep 10
  done
  
  echo "Health check failed after $retries attempts"
  return 1
}

# 新バージョンのデプロイ
kubectl apply -f k8s/

# ロールアウトの待機
kubectl rollout status deployment/mcp-server

# ヘルスチェック
if check_health "https://api.yourdomain.com"; then
  echo "Deployment successful!"
else
  echo "Deployment failed, rolling back..."
  kubectl rollout undo deployment/mcp-server
  exit 1
fi
```

### 2. ブルーグリーンデプロイメント

```yaml
# blue-green deployment script
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: mcp-server
spec:
  replicas: 3
  strategy:
    blueGreen:
      activeService: mcp-server-active
      previewService: mcp-server-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 30
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: mcp-server-preview
      postPromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: mcp-server-active
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: mcp-server:latest
```

### 3. 監視とアラート

```yaml
# prometheus-rules.yaml
groups:
- name: mcp-server
  rules:
  - alert: MCPServerDown
    expr: up{job="mcp-server"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "MCP Server is down"
      description: "MCP Server has been down for more than 1 minute"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: HighMemoryUsage
    expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.9
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is above 90%"
```

## 🎉 まとめ

この章では、MCPサーバーの本番環境へのデプロイメントについて包括的に学習しました：

- **コンテナ化**: Docker を使用した効率的なパッケージング
- **オーケストレーション**: Kubernetes での自動化されたデプロイメント
- **クラウドプラットフォーム**: AWS、GCP、Azure での実装
- **CI/CD**: 自動化されたデプロイメントパイプライン
- **監視**: 包括的な監視とログ管理
- **スケーリング**: 需要に応じた自動スケーリング

### 次のステップ

これで03-GettingStartedの章が完了しました。次は **[04-PracticalImplementation](../../04-PracticalImplementation/)** に進んで、より高度な実装テクニックを学びましょう。

## 📚 参考資料

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Azure Container Instances](https://docs.microsoft.com/en-us/azure/container-instances/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [GitOps with ArgoCD](https://argo-cd.readthedocs.io/)

---

*本番環境でのデプロイメントは、計画的かつ段階的に実行することが成功の鍵です。監視とアラートを設定し、問題が発生した際には迅速にロールバックできる体制を整えましょう。*