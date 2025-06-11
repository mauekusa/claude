# MCP上級トピック - Advanced Topics in MCP

> マルチモーダルAIワークフロー、セキュアスケーリング戦略、エンタープライズ環境でのMCP活用

## 📋 概要

MCPの基本と実装実践を習得した後、より高度で専門的な活用方法を学習します。マルチモーダルAI統合、大規模システムでのスケーリング、エンタープライズ環境での運用について詳しく解説します。

## 🎯 学習目標

- マルチモーダルAIワークフローの設計・実装方法を習得する
- セキュアなスケーリング戦略と分散システム設計を理解する
- エンタープライズ環境でのMCP統合パターンを学ぶ
- 高可用性・災害復旧・監視システムの構築方法を身につける
- カスタムプロトコル拡張とプラグインアーキテクチャを理解する

## 🎨 マルチモーダルAIワークフロー

### 1. 画像処理統合

```typescript
// src/services/multimodalService.ts
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import sharp from 'sharp';

interface ImageAnalysisResult {
  description: string;
  objects: Array<{
    name: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  text?: string;
}

export class MultimodalMCPService {
  private openai: OpenAI;
  private azureVision: any; // Azure Computer Vision client

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeImage(imagePath: string, analysisType: 'describe' | 'objects' | 'text' | 'all'): Promise<ImageAnalysisResult> {
    const imageBuffer = await fs.readFile(imagePath);
    
    // 画像の前処理
    const processedImage = await this.preprocessImage(imageBuffer);
    const base64Image = processedImage.toString('base64');

    const result: ImageAnalysisResult = {
      description: '',
      objects: []
    };

    switch (analysisType) {
      case 'describe':
        result.description = await this.generateImageDescription(base64Image);
        break;
      
      case 'objects':
        result.objects = await this.detectObjects(base64Image);
        break;
      
      case 'text':
        result.text = await this.extractText(base64Image);
        break;
      
      case 'all':
        [result.description, result.objects, result.text] = await Promise.all([
          this.generateImageDescription(base64Image),
          this.detectObjects(base64Image),
          this.extractText(base64Image)
        ]);
        break;
    }

    return result;
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(1024, 1024, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  private async generateImageDescription(base64Image: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この画像を詳細に説明してください。技術的な観点と視覚的な要素の両方を含めてください。"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    return response.choices[0]?.message?.content || "画像の説明を生成できませんでした";
  }

  private async detectObjects(base64Image: string): Promise<ImageAnalysisResult['objects']> {
    // Azure Computer Vision or custom object detection
    try {
      const response = await this.azureVision.analyzeImage({
        url: `data:image/jpeg;base64,${base64Image}`,
        features: ['Objects']
      });

      return response.objects.map((obj: any) => ({
        name: obj.object,
        confidence: obj.confidence,
        boundingBox: {
          x: obj.rectangle.x,
          y: obj.rectangle.y,
          width: obj.rectangle.w,
          height: obj.rectangle.h
        }
      }));
    } catch (error) {
      console.error('Object detection failed:', error);
      return [];
    }
  }

  private async extractText(base64Image: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この画像に含まれるすべてのテキストを抽出してください。レイアウトを保持して出力してください。"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateVisualReport(data: any[], chartType: 'bar' | 'line' | 'pie'): Promise<Buffer> {
    // Chart.js or D3.js を使用してチャートを生成
    const chartConfig = this.createChartConfig(data, chartType);
    
    // Puppeteer を使用してチャートをレンダリング
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <canvas id="chart" width="800" height="600"></canvas>
          <script>
            const ctx = document.getElementById('chart').getContext('2d');
            new Chart(ctx, ${JSON.stringify(chartConfig)});
          </script>
        </body>
      </html>
    `;

    await page.setContent(html);
    await page.waitForSelector('canvas');
    
    const chartImage = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });

    await browser.close();
    return chartImage;
  }

  private createChartConfig(data: any[], chartType: string): any {
    // Chart.js の設定を生成
    const baseConfig = {
      type: chartType,
      data: {
        labels: data.map(item => item.label),
        datasets: [{
          label: 'データ',
          data: data.map(item => item.value),
          backgroundColor: this.generateColors(data.length)
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'データビジュアライゼーション'
          }
        }
      }
    };

    return baseConfig;
  }

  private generateColors(count: number): string[] {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360) / count;
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
  }
}
```

### 2. 音声処理統合

```typescript
// src/services/audioService.ts
import { Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import OpenAI from 'openai';

export class AudioMCPService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async transcribeAudio(audioPath: string, language?: string): Promise<string> {
    // 音声ファイルを適切な形式に変換
    const convertedAudio = await this.convertAudioFormat(audioPath);
    
    const response = await this.openai.audio.transcriptions.create({
      file: createReadStream(convertedAudio),
      model: "whisper-1",
      language: language || 'ja',
      response_format: 'json',
      timestamp_granularities: ['word']
    });

    return response.text;
  }

  async generateSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<Buffer> {
    const response = await this.openai.audio.speech.create({
      model: "tts-1-hd",
      voice: voice,
      input: text,
      response_format: 'mp3'
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  }

  async analyzeAudioSentiment(audioPath: string): Promise<{
    transcript: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    emotions: Array<{ emotion: string; intensity: number }>;
  }> {
    // 音声を文字起こし
    const transcript = await this.transcribeAudio(audioPath);
    
    // テキストからセンチメント分析
    const sentimentResponse = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "音声から文字起こしされたテキストのセンチメント分析を行い、JSON形式で結果を返してください。"
        },
        {
          role: "user",
          content: `以下のテキストを分析してください：\n\n${transcript}\n\n以下の形式で返してください：\n{\n  "sentiment": "positive|negative|neutral",\n  "confidence": 0.0-1.0,\n  "emotions": [{"emotion": "感情名", "intensity": 0.0-1.0}]\n}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(sentimentResponse.choices[0]?.message?.content || '{}');
    
    return {
      transcript,
      sentiment: analysis.sentiment || 'neutral',
      confidence: analysis.confidence || 0.5,
      emotions: analysis.emotions || []
    };
  }

  private async convertAudioFormat(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace(/\.[^/.]+$/, '_converted.mp3');
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  async createPodcastFromText(text: string, speakers: Array<{
    name: string;
    voice: string;
    parts: string[];
  }>): Promise<Buffer> {
    const audioSegments: Buffer[] = [];

    for (const speaker of speakers) {
      for (const part of speaker.parts) {
        const speechBuffer = await this.generateSpeech(part, speaker.voice as any);
        audioSegments.push(speechBuffer);
        
        // 話者間に短い無音を挿入
        const silenceBuffer = await this.generateSilence(0.5); // 0.5秒の無音
        audioSegments.push(silenceBuffer);
      }
    }

    // 音声セグメントを結合
    return this.combineAudioBuffers(audioSegments);
  }

  private async generateSilence(duration: number): Promise<Buffer> {
    // ffmpeg を使用して無音を生成
    const outputPath = `/tmp/silence_${Date.now()}.mp3`;
    
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`anullsrc=duration=${duration}:sample_rate=16000:channel_layout=mono`)
        .inputFormat('lavfi')
        .toFormat('mp3')
        .on('end', async () => {
          const buffer = await fs.readFile(outputPath);
          resolve(buffer);
        })
        .on('error', reject)
        .save(outputPath);
    });
  }

  private async combineAudioBuffers(buffers: Buffer[]): Promise<Buffer> {
    // 複数の音声バッファを結合
    const tempFiles = buffers.map((buffer, index) => {
      const path = `/tmp/audio_${index}_${Date.now()}.mp3`;
      fs.writeFileSync(path, buffer);
      return path;
    });

    const outputPath = `/tmp/combined_${Date.now()}.mp3`;
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      tempFiles.forEach(file => {
        command.input(file);
      });
      
      command
        .on('end', async () => {
          const combinedBuffer = await fs.readFile(outputPath);
          
          // 一時ファイルを削除
          tempFiles.forEach(file => fs.unlinkSync(file));
          fs.unlinkSync(outputPath);
          
          resolve(combinedBuffer);
        })
        .on('error', reject)
        .mergeToFile(outputPath);
    });
  }
}
```

## 🔐 セキュアスケーリング戦略

### 1. 分散認証システム

```typescript
// src/security/distributedAuth.ts
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import crypto from 'crypto';

interface TokenPayload {
  userId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}

export class DistributedAuthService {
  private redis: Redis;
  private jwtSecret: string;
  private tokenExpiry: number = 3600; // 1時間

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
  }

  async generateToken(userId: string, roles: string[], permissions: string[]): Promise<string> {
    const sessionId = crypto.randomUUID();
    const payload: TokenPayload = {
      userId,
      roles,
      permissions,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.tokenExpiry
    };

    const token = jwt.sign(payload, this.jwtSecret);
    
    // Redis にセッション情報を保存
    await this.redis.setex(
      `session:${sessionId}`,
      this.tokenExpiry,
      JSON.stringify({
        userId,
        roles,
        permissions,
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString()
      })
    );

    return token;
  }

  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;
      
      // Redis でセッションの有効性を確認
      const sessionData = await this.redis.get(`session:${payload.sessionId}`);
      if (!sessionData) {
        return null;
      }

      // 最終アクセス時刻を更新
      const session = JSON.parse(sessionData);
      session.lastAccess = new Date().toISOString();
      await this.redis.setex(
        `session:${payload.sessionId}`,
        this.tokenExpiry,
        JSON.stringify(session)
      );

      return payload;
    } catch (error) {
      return null;
    }
  }

  async revokeToken(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const pattern = `session:*`;
    const keys = await this.redis.keys(pattern);
    
    for (const key of keys) {
      const sessionData = await this.redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.userId === userId) {
          await this.redis.del(key);
        }
      }
    }
  }

  async checkPermission(token: string, requiredPermission: string): Promise<boolean> {
    const payload = await this.validateToken(token);
    if (!payload) {
      return false;
    }

    return payload.permissions.includes(requiredPermission) || 
           payload.permissions.includes('*'); // 管理者権限
  }

  async refreshToken(token: string): Promise<string | null> {
    const payload = await this.validateToken(token);
    if (!payload) {
      return null;
    }

    // 新しいトークンを生成
    return this.generateToken(payload.userId, payload.roles, payload.permissions);
  }
}
```

### 2. 負荷分散とサーキットブレーカー

```typescript
// src/scaling/loadBalancer.ts
interface ServerNode {
  id: string;
  url: string;
  weight: number;
  currentConnections: number;
  maxConnections: number;
  healthy: boolean;
  lastHealthCheck: Date;
}

export class MCPLoadBalancer {
  private servers: Map<string, ServerNode> = new Map();
  private roundRobinIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout;

  constructor() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // 30秒ごとにヘルスチェック
  }

  addServer(server: Omit<ServerNode, 'currentConnections' | 'healthy' | 'lastHealthCheck'>): void {
    const serverNode: ServerNode = {
      ...server,
      currentConnections: 0,
      healthy: true,
      lastHealthCheck: new Date()
    };
    
    this.servers.set(server.id, serverNode);
  }

  removeServer(serverId: string): void {
    this.servers.delete(serverId);
  }

  getNextServer(strategy: 'round-robin' | 'least-connections' | 'weighted' = 'round-robin'): ServerNode | null {
    const healthyServers = Array.from(this.servers.values()).filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    switch (strategy) {
      case 'round-robin':
        return this.getRoundRobinServer(healthyServers);
      
      case 'least-connections':
        return this.getLeastConnectionsServer(healthyServers);
      
      case 'weighted':
        return this.getWeightedServer(healthyServers);
      
      default:
        return healthyServers[0];
    }
  }

  private getRoundRobinServer(servers: ServerNode[]): ServerNode {
    const server = servers[this.roundRobinIndex % servers.length];
    this.roundRobinIndex++;
    return server;
  }

  private getLeastConnectionsServer(servers: ServerNode[]): ServerNode {
    return servers.reduce((min, server) => 
      server.currentConnections < min.currentConnections ? server : min
    );
  }

  private getWeightedServer(servers: ServerNode[]): ServerNode {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }
    
    return servers[0];
  }

  async incrementConnections(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (server) {
      server.currentConnections++;
    }
  }

  async decrementConnections(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (server && server.currentConnections > 0) {
      server.currentConnections--;
    }
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.servers.values()).map(server => 
      this.checkServerHealth(server)
    );
    
    await Promise.allSettled(healthCheckPromises);
  }

  private async checkServerHealth(server: ServerNode): Promise<void> {
    try {
      const response = await fetch(`${server.url}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      server.healthy = response.ok;
      server.lastHealthCheck = new Date();
    } catch (error) {
      server.healthy = false;
      server.lastHealthCheck = new Date();
    }
  }
}

// サーキットブレーカーパターン
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1分
    private successThreshold: number = 3
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('回路が開いています - サービスが利用できません');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return false;
    }

    const now = new Date();
    return (now.getTime() - this.lastFailureTime.getTime()) >= this.recoveryTimeout;
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}
```

### 3. マイクロサービスアーキテクチャ

```typescript
// src/microservices/serviceRegistry.ts
interface ServiceInstance {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  metadata: Record<string, any>;
  registeredAt: Date;
  lastHeartbeat: Date;
}

export class ServiceRegistry {
  private services: Map<string, ServiceInstance[]> = new Map();
  private heartbeatInterval: number = 30000; // 30秒
  private maxHeartbeatMiss: number = 3;

  constructor() {
    // 定期的にサービスのヘルスチェックを実行
    setInterval(() => {
      this.cleanupStaleServices();
    }, this.heartbeatInterval);
  }

  async registerService(service: Omit<ServiceInstance, 'id' | 'registeredAt' | 'lastHeartbeat'>): Promise<string> {
    const serviceId = crypto.randomUUID();
    const instance: ServiceInstance = {
      ...service,
      id: serviceId,
      registeredAt: new Date(),
      lastHeartbeat: new Date()
    };

    if (!this.services.has(service.name)) {
      this.services.set(service.name, []);
    }

    this.services.get(service.name)!.push(instance);
    
    console.log(`サービス登録: ${service.name} (ID: ${serviceId})`);
    return serviceId;
  }

  async deregisterService(serviceName: string, serviceId: string): Promise<void> {
    const instances = this.services.get(serviceName);
    if (instances) {
      const filteredInstances = instances.filter(instance => instance.id !== serviceId);
      this.services.set(serviceName, filteredInstances);
      console.log(`サービス登録解除: ${serviceName} (ID: ${serviceId})`);
    }
  }

  async heartbeat(serviceName: string, serviceId: string): Promise<void> {
    const instances = this.services.get(serviceName);
    if (instances) {
      const instance = instances.find(inst => inst.id === serviceId);
      if (instance) {
        instance.lastHeartbeat = new Date();
      }
    }
  }

  async discoverServices(serviceName: string): Promise<ServiceInstance[]> {
    const instances = this.services.get(serviceName) || [];
    return instances.filter(instance => this.isServiceHealthy(instance));
  }

  async getServiceByVersion(serviceName: string, version: string): Promise<ServiceInstance[]> {
    const instances = await this.discoverServices(serviceName);
    return instances.filter(instance => instance.version === version);
  }

  private isServiceHealthy(instance: ServiceInstance): boolean {
    const now = new Date();
    const timeSinceLastHeartbeat = now.getTime() - instance.lastHeartbeat.getTime();
    return timeSinceLastHeartbeat <= (this.heartbeatInterval * this.maxHeartbeatMiss);
  }

  private cleanupStaleServices(): void {
    for (const [serviceName, instances] of this.services.entries()) {
      const healthyInstances = instances.filter(instance => this.isServiceHealthy(instance));
      
      if (healthyInstances.length !== instances.length) {
        const removedCount = instances.length - healthyInstances.length;
        console.log(`${serviceName}: ${removedCount}個の古いサービスインスタンスを削除しました`);
        this.services.set(serviceName, healthyInstances);
      }
    }
  }

  async getAllServices(): Promise<Map<string, ServiceInstance[]>> {
    const result = new Map();
    
    for (const [serviceName, instances] of this.services.entries()) {
      const healthyInstances = instances.filter(instance => this.isServiceHealthy(instance));
      if (healthyInstances.length > 0) {
        result.set(serviceName, healthyInstances);
      }
    }
    
    return result;
  }
}

// APIゲートウェイ
export class MCPApiGateway {
  private serviceRegistry: ServiceRegistry;
  private loadBalancer: MCPLoadBalancer;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(serviceRegistry: ServiceRegistry, loadBalancer: MCPLoadBalancer) {
    this.serviceRegistry = serviceRegistry;
    this.loadBalancer = loadBalancer;
  }

  async routeRequest(serviceName: string, method: string, path: string, data: any): Promise<any> {
    // サービス発見
    const serviceInstances = await this.serviceRegistry.discoverServices(serviceName);
    if (serviceInstances.length === 0) {
      throw new Error(`サービス ${serviceName} が利用できません`);
    }

    // サーキットブレーカーを取得または作成
    const circuitBreakerKey = `${serviceName}-${method}-${path}`;
    if (!this.circuitBreakers.has(circuitBreakerKey)) {
      this.circuitBreakers.set(circuitBreakerKey, new CircuitBreaker());
    }
    
    const circuitBreaker = this.circuitBreakers.get(circuitBreakerKey)!;

    // リクエストを実行
    return circuitBreaker.execute(async () => {
      const selectedService = serviceInstances[0]; // 簡単な選択ロジック
      
      const response = await fetch(`http://${selectedService.host}:${selectedService.port}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        throw new Error(`Service request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    });
  }

  async getServiceHealth(): Promise<Record<string, any>> {
    const allServices = await this.serviceRegistry.getAllServices();
    const health: Record<string, any> = {};

    for (const [serviceName, instances] of allServices.entries()) {
      health[serviceName] = {
        instanceCount: instances.length,
        instances: instances.map(instance => ({
          id: instance.id,
          host: instance.host,
          port: instance.port,
          version: instance.version,
          registeredAt: instance.registeredAt,
          lastHeartbeat: instance.lastHeartbeat
        }))
      };
    }

    return health;
  }
}
```

## 🏢 エンタープライズ統合

### 1. エンタープライズセキュリティ

```typescript
// src/enterprise/security.ts
import { LDAP } from 'ldapjs-promise';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class EnterpriseSecurityManager {
  private ldapClient: LDAP;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';

  constructor() {
    this.ldapClient = new LDAP({
      url: process.env.LDAP_URL || 'ldap://localhost:389'
    });
    
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex'), 'hex');
  }

  async authenticateWithLDAP(username: string, password: string): Promise<{
    authenticated: boolean;
    userInfo?: any;
    groups?: string[];
  }> {
    try {
      await this.ldapClient.bind(`cn=${username},${process.env.LDAP_BASE_DN}`, password);
      
      // ユーザー情報を取得
      const searchResult = await this.ldapClient.search(process.env.LDAP_BASE_DN!, {
        filter: `(cn=${username})`,
        scope: 'sub',
        attributes: ['cn', 'mail', 'memberOf', 'department']
      });

      const userInfo = searchResult.entries[0];
      const groups = userInfo.memberOf || [];

      return {
        authenticated: true,
        userInfo: {
          username: userInfo.cn,
          email: userInfo.mail,
          department: userInfo.department
        },
        groups: groups.map((group: string) => this.extractGroupName(group))
      };
    } catch (error) {
      return { authenticated: false };
    } finally {
      await this.ldapClient.unbind();
    }
  }

  private extractGroupName(groupDN: string): string {
    const match = groupDN.match(/CN=([^,]+)/i);
    return match ? match[1] : groupDN;
  }

  encryptSensitiveData(data: string): { encrypted: string; iv: string; tag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decryptSensitiveData(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    const decipher = createDecipheriv(this.algorithm, this.encryptionKey, Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async auditLog(action: string, userId: string, resource: string, metadata: any = {}): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      resource,
      metadata,
      hash: this.generateLogHash(action, userId, resource, metadata)
    };

    // 監査ログをセキュアなストレージに保存
    await this.saveAuditLog(logEntry);
  }

  private generateLogHash(action: string, userId: string, resource: string, metadata: any): string {
    const data = `${action}:${userId}:${resource}:${JSON.stringify(metadata)}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private async saveAuditLog(logEntry: any): Promise<void> {
    // 暗号化して保存
    const encryptedEntry = this.encryptSensitiveData(JSON.stringify(logEntry));
    
    // データベースまたはセキュアなログサービスに保存
    // 実装は具体的な要件に応じて調整
    console.log('Audit log saved:', {
      timestamp: logEntry.timestamp,
      action: logEntry.action,
      userId: logEntry.userId,
      resource: logEntry.resource
    });
  }
}
```

### 2. 企業システム統合

```typescript
// src/enterprise/integration.ts
import { EventEmitter } from 'events';

interface SystemIntegration {
  name: string;
  type: 'erp' | 'crm' | 'hr' | 'finance' | 'other';
  endpoint: string;
  authConfig: any;
  dataMapping: Record<string, string>;
}

export class EnterpriseIntegrationManager extends EventEmitter {
  private integrations: Map<string, SystemIntegration> = new Map();
  private connectionPool: Map<string, any> = new Map();

  async registerIntegration(integration: SystemIntegration): Promise<void> {
    this.integrations.set(integration.name, integration);
    
    // 接続テスト
    try {
      await this.testConnection(integration);
      this.emit('integration:registered', integration.name);
    } catch (error) {
      this.emit('integration:error', { name: integration.name, error });
      throw error;
    }
  }

  async syncDataFromSystem(systemName: string, dataType: string, filters: any = {}): Promise<any[]> {
    const integration = this.integrations.get(systemName);
    if (!integration) {
      throw new Error(`統合システム '${systemName}' が見つかりません`);
    }

    try {
      const rawData = await this.fetchDataFromSystem(integration, dataType, filters);
      const mappedData = this.mapData(rawData, integration.dataMapping);
      
      this.emit('data:synced', { system: systemName, type: dataType, count: mappedData.length });
      return mappedData;
    } catch (error) {
      this.emit('sync:error', { system: systemName, error });
      throw error;
    }
  }

  async pushDataToSystem(systemName: string, dataType: string, data: any[]): Promise<void> {
    const integration = this.integrations.get(systemName);
    if (!integration) {
      throw new Error(`統合システム '${systemName}' が見つかりません`);
    }

    try {
      const transformedData = this.reverseMapData(data, integration.dataMapping);
      await this.pushDataToExternalSystem(integration, dataType, transformedData);
      
      this.emit('data:pushed', { system: systemName, type: dataType, count: data.length });
    } catch (error) {
      this.emit('push:error', { system: systemName, error });
      throw error;
    }
  }

  private async testConnection(integration: SystemIntegration): Promise<void> {
    // システムタイプに応じた接続テスト
    switch (integration.type) {
      case 'erp':
        await this.testERPConnection(integration);
        break;
      case 'crm':
        await this.testCRMConnection(integration);
        break;
      case 'hr':
        await this.testHRConnection(integration);
        break;
      default:
        await this.testGenericConnection(integration);
    }
  }

  private async testERPConnection(integration: SystemIntegration): Promise<void> {
    // SAP、Oracle、NetSuite等のERP接続テスト
    const response = await fetch(`${integration.endpoint}/api/health`, {
      headers: {
        'Authorization': `Bearer ${integration.authConfig.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ERP接続失敗: ${response.status} ${response.statusText}`);
    }
  }

  private async testCRMConnection(integration: SystemIntegration): Promise<void> {
    // Salesforce、HubSpot等のCRM接続テスト
    const response = await fetch(`${integration.endpoint}/services/data/v58.0/`, {
      headers: {
        'Authorization': `Bearer ${integration.authConfig.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CRM接続失敗: ${response.status} ${response.statusText}`);
    }
  }

  private async testHRConnection(integration: SystemIntegration): Promise<void> {
    // Workday、BambooHR等のHR接続テスト
    const response = await fetch(`${integration.endpoint}/api/v1/meta`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${integration.authConfig.username}:${integration.authConfig.password}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HR接続失敗: ${response.status} ${response.statusText}`);
    }
  }

  private async testGenericConnection(integration: SystemIntegration): Promise<void> {
    const response = await fetch(`${integration.endpoint}/health`);
    if (!response.ok) {
      throw new Error(`接続失敗: ${response.status} ${response.statusText}`);
    }
  }

  private async fetchDataFromSystem(integration: SystemIntegration, dataType: string, filters: any): Promise<any[]> {
    // システムから実際にデータを取得
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`${integration.endpoint}/api/data/${dataType}?${queryParams}`, {
      headers: this.getAuthHeaders(integration)
    });

    if (!response.ok) {
      throw new Error(`データ取得失敗: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results || data.data || [data];
  }

  private async pushDataToExternalSystem(integration: SystemIntegration, dataType: string, data: any[]): Promise<void> {
    const response = await fetch(`${integration.endpoint}/api/data/${dataType}`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(integration),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`データ送信失敗: ${response.status} ${response.statusText}`);
    }
  }

  private getAuthHeaders(integration: SystemIntegration): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (integration.authConfig.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${integration.authConfig.token}`;
        break;
      case 'basic':
        const credentials = Buffer.from(`${integration.authConfig.username}:${integration.authConfig.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'api-key':
        headers[integration.authConfig.keyHeader || 'X-API-Key'] = integration.authConfig.apiKey;
        break;
    }

    return headers;
  }

  private mapData(rawData: any[], mapping: Record<string, string>): any[] {
    return rawData.map(item => {
      const mappedItem: any = {};
      
      for (const [targetField, sourceField] of Object.entries(mapping)) {
        mappedItem[targetField] = this.getNestedValue(item, sourceField);
      }
      
      return mappedItem;
    });
  }

  private reverseMapData(data: any[], mapping: Record<string, string>): any[] {
    const reverseMapping = Object.fromEntries(
      Object.entries(mapping).map(([target, source]) => [source, target])
    );
    
    return this.mapData(data, reverseMapping);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async getIntegrationStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const [name, integration] of this.integrations.entries()) {
      try {
        await this.testConnection(integration);
        status[name] = { status: 'connected', lastCheck: new Date().toISOString() };
      } catch (error) {
        status[name] = { 
          status: 'disconnected', 
          error: error.message, 
          lastCheck: new Date().toISOString() 
        };
      }
    }

    return status;
  }
}
```

## 🎓 実習課題

### 課題1: マルチモーダルワークフロー
- 画像、音声、テキストを組み合わせたMCPワークフローを設計・実装する
- 各モダリティ間のデータ変換とフォーマット統一を実現する

### 課題2: 分散システム設計
- マイクロサービスアーキテクチャでMCPシステムを構築する
- 負荷分散、サーキットブレーカー、サービス発見を実装する

### 課題3: エンタープライズ統合
- 既存の企業システム（ERP/CRM）とMCPを統合する
- セキュリティ、監査、データマッピングを考慮した設計を行う

## 📚 関連リソース

- [Azure AI Services](https://azure.microsoft.com/ja-jp/products/ai-services)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Microservices Patterns](https://microservices.io/patterns/)
- [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/)

## 🔗 次のステップ

上級トピックを習得したら、[06-CommunityContributions](../06-CommunityContributions/README.md) でコミュニティ貢献について学習しましょう。

---

*高度なMCP活用により、エンタープライズグレードのAIソリューションを構築できるようになります。*