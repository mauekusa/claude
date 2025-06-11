# 08. MCPのベストプラクティス

## 概要

この章では、Model Context Protocol (MCP) システムを設計、実装、運用する際のベストプラクティスを包括的に解説します。パフォーマンス最適化、耐障害性の確保、セキュリティ強化、そしてテスト戦略について実践的なガイドラインを提供します。

## 📋 章の内容

### 8.1 パフォーマンス最適化
- 効率的なデータ処理戦略
- キャッシング戦略
- 非同期処理の最適化

### 8.2 耐障害性システム設計
- エラーハンドリング戦略
- 復旧メカニズム
- 冗長性とフェイルオーバー

### 8.3 セキュリティベストプラクティス
- 認証と認可
- データ暗号化
- 脆弱性対策

### 8.4 テストと品質保証
- 包括的テスト戦略
- 継続的インテグレーション
- 監視とアラート

---

## ⚡ パフォーマンス最適化

### 効率的なデータ処理戦略

#### 1. バッチ処理とストリーミング処理の選択

```typescript
// 大量データ処理のための最適化パターン
class OptimizedDataProcessor {
  private batchSize: number = 100;
  private streamThreshold: number = 1000;
  
  async processData(dataItems: DataItem[]): Promise<ProcessedData[]> {
    if (dataItems.length > this.streamThreshold) {
      return await this.streamProcess(dataItems);
    } else {
      return await this.batchProcess(dataItems);
    }
  }
  
  private async streamProcess(dataItems: DataItem[]): Promise<ProcessedData[]> {
    const results: ProcessedData[] = [];
    const stream = new ReadableStream({
      start(controller) {
        dataItems.forEach(item => controller.enqueue(item));
        controller.close();
      }
    });
    
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const processed = await this.processItem(value);
      results.push(processed);
      
      // メモリ使用量を制御
      if (results.length % this.batchSize === 0) {
        await this.flushToStorage(results.splice(0, this.batchSize));
      }
    }
    
    return results;
  }
  
  private async batchProcess(dataItems: DataItem[]): Promise<ProcessedData[]> {
    const batches = this.createBatches(dataItems, this.batchSize);
    const results = await Promise.all(
      batches.map(batch => this.processBatch(batch))
    );
    
    return results.flat();
  }
}
```

#### 2. 効果的なキャッシング戦略

```typescript
// 多層キャッシュシステム
class MultiLevelCache {
  private memoryCache: LRUCache<string, any>;
  private redisCache: RedisClient;
  private databaseCache: DatabaseCache;
  
  constructor() {
    this.memoryCache = new LRUCache({
      max: 1000,
      ttl: 60000 // 1分
    });
  }
  
  async get(key: string): Promise<any> {
    // Level 1: メモリキャッシュ
    let value = this.memoryCache.get(key);
    if (value !== undefined) {
      this.recordCacheHit('memory', key);
      return value;
    }
    
    // Level 2: Redisキャッシュ
    value = await this.redisCache.get(key);
    if (value !== null) {
      this.memoryCache.set(key, value);
      this.recordCacheHit('redis', key);
      return value;
    }
    
    // Level 3: データベースキャッシュ
    value = await this.databaseCache.get(key);
    if (value !== null) {
      await this.redisCache.setex(key, 300, JSON.stringify(value)); // 5分
      this.memoryCache.set(key, value);
      this.recordCacheHit('database', key);
      return value;
    }
    
    this.recordCacheMiss(key);
    return null;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    // すべてのキャッシュレベルに設定
    this.memoryCache.set(key, value);
    await this.redisCache.setex(key, ttl || 300, JSON.stringify(value));
    await this.databaseCache.set(key, value, ttl);
  }
  
  private recordCacheHit(level: string, key: string): void {
    metrics.incrementCounter('cache_hits', { level, key });
  }
  
  private recordCacheMiss(key: string): void {
    metrics.incrementCounter('cache_misses', { key });
  }
}
```

#### 3. 非同期処理の最適化

```typescript
// 効率的な非同期処理パターン
class AsyncOptimizer {
  private concurrencyLimit: number = 10;
  private semaphore: Semaphore;
  
  constructor() {
    this.semaphore = new Semaphore(this.concurrencyLimit);
  }
  
  async processTasksConcurrently<T, R>(
    tasks: T[],
    processor: (task: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    const chunks = this.chunkArray(tasks, this.concurrencyLimit);
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(task => this.processWithSemaphore(task, processor))
      );
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`Task failed:`, result.reason);
          // エラー処理とリトライロジック
          this.scheduleRetry(chunk[index], processor);
        }
      });
    }
    
    return results;
  }
  
  private async processWithSemaphore<T, R>(
    task: T,
    processor: (task: T) => Promise<R>
  ): Promise<R> {
    await this.semaphore.acquire();
    try {
      return await processor(task);
    } finally {
      this.semaphore.release();
    }
  }
  
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
```

---

## 🛡️ 耐障害性システム設計

### エラーハンドリング戦略

#### 1. 階層化エラーハンドリング

```typescript
// 包括的エラーハンドリングシステム
class ErrorHandler {
  private errorCategories: Map<string, ErrorCategory> = new Map();
  private retryStrategies: Map<string, RetryStrategy> = new Map();
  
  constructor() {
    this.initializeErrorCategories();
    this.initializeRetryStrategies();
  }
  
  async handleError(error: Error, context: ErrorContext): Promise<ErrorResult> {
    const category = this.categorizeError(error);
    const strategy = this.retryStrategies.get(category.type);
    
    // エラーログ
    logger.error(`Error occurred in ${context.operation}:`, {
      error: error.message,
      stack: error.stack,
      category: category.type,
      context
    });
    
    // メトリクス記録
    metrics.incrementCounter('errors_total', {
      category: category.type,
      operation: context.operation
    });
    
    // リトライ戦略の実行
    if (strategy && category.retryable) {
      return await this.executeRetryStrategy(strategy, context);
    }
    
    // 代替処理
    if (category.fallbackAvailable) {
      return await this.executeFallback(context);
    }
    
    // 最終的なエラー処理
    await this.notifyOnCriticalError(error, context);
    throw new CategorizedError(error, category);
  }
  
  private categorizeError(error: Error): ErrorCategory {
    if (error instanceof NetworkError) {
      return {
        type: 'network',
        severity: 'medium',
        retryable: true,
        fallbackAvailable: true
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        type: 'validation',
        severity: 'low',
        retryable: false,
        fallbackAvailable: false
      };
    }
    
    if (error instanceof SystemError) {
      return {
        type: 'system',
        severity: 'high',
        retryable: true,
        fallbackAvailable: true
      };
    }
    
    return {
      type: 'unknown',
      severity: 'high',
      retryable: false,
      fallbackAvailable: false
    };
  }
}
```

#### 2. サーキットブレーカーパターン

```typescript
// サーキットブレーカー実装
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1分
    private successThreshold: number = 3
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        throw new Error('Circuit breaker is open');
      }
      
      // 半開状態に移行
      this.state = 'half-open';
      this.successCount = 0;
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
    
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
      }
    }
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }
  
  getState(): string {
    return this.state;
  }
}
```

### 3. 冗長性とフェイルオーバー

```typescript
// 高可用性MCPサーバー
class HighAvailabilityMCPServer {
  private primaryServers: MCPServerInstance[] = [];
  private backupServers: MCPServerInstance[] = [];
  private loadBalancer: LoadBalancer;
  private healthChecker: HealthChecker;
  
  constructor() {
    this.loadBalancer = new RoundRobinLoadBalancer();
    this.healthChecker = new HealthChecker({
      checkInterval: 30000, // 30秒
      timeout: 5000 // 5秒
    });
    
    this.startHealthChecking();
  }
  
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const availableServers = this.getAvailableServers();
    
    if (availableServers.length === 0) {
      throw new Error('No available servers');
    }
    
    let lastError: Error | null = null;
    
    // 利用可能なサーバーで順次試行
    for (const server of availableServers) {
      try {
        return await server.handleRequest(request);
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Server ${server.id} failed, trying next server:`, error);
        this.markServerUnhealthy(server);
      }
    }
    
    throw lastError || new Error('All servers failed');
  }
  
  private getAvailableServers(): MCPServerInstance[] {
    return this.primaryServers.filter(server => server.isHealthy);
  }
  
  private startHealthChecking(): void {
    setInterval(async () => {
      await this.checkAllServers();
    }, this.healthChecker.checkInterval);
  }
  
  private async checkAllServers(): Promise<void> {
    const allServers = [...this.primaryServers, ...this.backupServers];
    
    const healthChecks = allServers.map(async (server) => {
      try {
        const isHealthy = await this.healthChecker.check(server);
        server.isHealthy = isHealthy;
        
        if (isHealthy && !this.primaryServers.includes(server)) {
          // バックアップサーバーが回復した場合、プライマリに昇格
          this.promoteToPrimary(server);
        }
      } catch (error) {
        server.isHealthy = false;
        logger.error(`Health check failed for server ${server.id}:`, error);
      }
    });
    
    await Promise.allSettled(healthChecks);
  }
}
```

---

## 🔒 セキュリティベストプラクティス

### 認証と認可

#### 1. JWT-based認証システム

```typescript
// 安全なJWT認証実装
class SecureJWTAuth {
  private secretKey: string;
  private publicKey: string;
  private privateKey: string;
  
  constructor() {
    this.secretKey = process.env.JWT_SECRET || this.generateSecretKey();
    this.loadKeyPair();
  }
  
  async generateToken(user: User, permissions: string[]): Promise<string> {
    const payload = {
      userId: user.id,
      username: user.username,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1時間
      jti: crypto.randomUUID() // JWT ID for revocation
    };
    
    const token = jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      issuer: 'mcp-server',
      audience: 'mcp-client'
    });
    
    // トークンをブラックリストチェック用に記録
    await this.storeTokenJTI(payload.jti, payload.exp);
    
    return token;
  }
  
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'mcp-server',
        audience: 'mcp-client'
      }) as TokenPayload;
      
      // ブラックリストチェック
      const isRevoked = await this.isTokenRevoked(decoded.jti);
      if (isRevoked) {
        throw new Error('Token has been revoked');
      }
      
      return decoded;
    } catch (error) {
      throw new AuthenticationError('Invalid token', error);
    }
  }
  
  async revokeToken(jti: string): Promise<void> {
    await this.addToBlacklist(jti);
  }
  
  private generateSecretKey(): string {
    return crypto.randomBytes(256).toString('hex');
  }
}
```

#### 2. 権限ベースアクセス制御 (RBAC)

```typescript
// Role-Based Access Control実装
class RBACManager {
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, string[]> = new Map();
  
  constructor() {
    this.initializeDefaultRoles();
  }
  
  defineRole(roleName: string, permissions: Permission[]): void {
    this.roles.set(roleName, {
      name: roleName,
      permissions: new Set(permissions.map(p => p.name))
    });
  }
  
  assignRole(userId: string, roleName: string): void {
    const userRoles = this.userRoles.get(userId) || [];
    if (!userRoles.includes(roleName)) {
      userRoles.push(roleName);
      this.userRoles.set(userId, userRoles);
    }
  }
  
  async checkPermission(
    userId: string,
    requiredPermission: string,
    resource?: string
  ): Promise<boolean> {
    const userRoles = this.userRoles.get(userId) || [];
    
    for (const roleName of userRoles) {
      const role = this.roles.get(roleName);
      if (role && this.roleHasPermission(role, requiredPermission, resource)) {
        return true;
      }
    }
    
    return false;
  }
  
  private roleHasPermission(
    role: Role,
    permission: string,
    resource?: string
  ): boolean {
    // 基本権限チェック
    if (role.permissions.has(permission)) {
      return true;
    }
    
    // リソース特有の権限チェック
    if (resource) {
      const resourcePermission = `${permission}:${resource}`;
      if (role.permissions.has(resourcePermission)) {
        return true;
      }
    }
    
    // ワイルドカード権限チェック
    const wildcardPermission = `${permission}:*`;
    return role.permissions.has(wildcardPermission);
  }
  
  private initializeDefaultRoles(): void {
    this.defineRole('admin', [
      { name: 'read:*' },
      { name: 'write:*' },
      { name: 'delete:*' },
      { name: 'manage:*' }
    ]);
    
    this.defineRole('user', [
      { name: 'read:own' },
      { name: 'write:own' }
    ]);
    
    this.defineRole('readonly', [
      { name: 'read:*' }
    ]);
  }
}
```

### 3. データ暗号化

```typescript
// 包括的データ暗号化システム
class DataEncryption {
  private encryptionKey: Buffer;
  private signingKey: Buffer;
  
  constructor() {
    this.encryptionKey = this.deriveKey(process.env.ENCRYPTION_SECRET!);
    this.signingKey = this.deriveKey(process.env.SIGNING_SECRET!);
  }
  
  async encryptSensitiveData(data: any): Promise<EncryptedData> {
    const plaintext = JSON.stringify(data);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('MCP-Data'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    const encryptedData = {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      timestamp: Date.now()
    };
    
    // デジタル署名を追加
    const signature = this.signData(encryptedData);
    
    return { ...encryptedData, signature };
  }
  
  async decryptSensitiveData(encryptedData: EncryptedData): Promise<any> {
    // 署名検証
    const isValid = this.verifySignature(encryptedData);
    if (!isValid) {
      throw new Error('Data integrity check failed');
    }
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    decipher.setAAD(Buffer.from('MCP-Data'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
  
  private signData(data: object): string {
    const message = JSON.stringify(data);
    const hmac = crypto.createHmac('sha256', this.signingKey);
    hmac.update(message);
    return hmac.digest('hex');
  }
  
  private verifySignature(data: EncryptedData): boolean {
    const { signature, ...dataWithoutSignature } = data;
    const expectedSignature = this.signData(dataWithoutSignature);
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
  
  private deriveKey(secret: string): Buffer {
    return crypto.pbkdf2Sync(secret, 'mcp-salt', 100000, 32, 'sha256');
  }
}
```

---

## 🧪 テストと品質保証

### 包括的テスト戦略

#### 1. 単体テスト戦略

```typescript
// MCPサーバーの単体テスト例
describe('MCPServer', () => {
  let server: MCPServer;
  let mockDataSource: jest.Mocked<DataSource>;
  
  beforeEach(() => {
    mockDataSource = {
      getData: jest.fn(),
      updateData: jest.fn(),
      deleteData: jest.fn()
    } as jest.Mocked<DataSource>;
    
    server = new MCPServer({ dataSource: mockDataSource });
  });
  
  describe('handleToolCall', () => {
    it('should handle valid tool calls successfully', async () => {
      // Arrange
      const toolCall: ToolCall = {
        name: 'getData',
        arguments: { id: '123' }
      };
      
      const expectedData = { id: '123', name: 'Test Data' };
      mockDataSource.getData.mockResolvedValue(expectedData);
      
      // Act
      const result = await server.handleToolCall(toolCall);
      
      // Assert
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(expectedData);
      expect(mockDataSource.getData).toHaveBeenCalledWith('123');
    });
    
    it('should handle errors gracefully', async () => {
      // Arrange
      const toolCall: ToolCall = {
        name: 'getData',
        arguments: { id: 'invalid' }
      };
      
      mockDataSource.getData.mockRejectedValue(new Error('Data not found'));
      
      // Act & Assert
      await expect(server.handleToolCall(toolCall))
        .rejects.toThrow('Data not found');
    });
    
    it('should validate input parameters', async () => {
      // Arrange
      const toolCall: ToolCall = {
        name: 'getData',
        arguments: {} // Missing required 'id' parameter
      };
      
      // Act & Assert
      await expect(server.handleToolCall(toolCall))
        .rejects.toThrow('Missing required parameter: id');
    });
  });
});
```

#### 2. 統合テスト戦略

```typescript
// MCPクライアント-サーバー統合テスト
describe('MCP Integration Tests', () => {
  let server: MCPServer;
  let client: MCPClient;
  let testContainer: TestContainer;
  
  beforeAll(async () => {
    testContainer = await setupTestContainer();
    server = await createTestServer(testContainer);
    client = await createTestClient();
    
    await server.start();
    await client.connect();
  });
  
  afterAll(async () => {
    await client.disconnect();
    await server.stop();
    await testContainer.cleanup();
  });
  
  it('should perform end-to-end data operations', async () => {
    // Create data
    const createResult = await client.callTool('createData', {
      name: 'Integration Test Data',
      value: 42
    });
    
    expect(createResult.success).toBe(true);
    const dataId = createResult.data.id;
    
    // Retrieve data
    const getResult = await client.callTool('getData', { id: dataId });
    expect(getResult.data.name).toBe('Integration Test Data');
    expect(getResult.data.value).toBe(42);
    
    // Update data
    const updateResult = await client.callTool('updateData', {
      id: dataId,
      value: 84
    });
    
    expect(updateResult.success).toBe(true);
    
    // Verify update
    const verifyResult = await client.callTool('getData', { id: dataId });
    expect(verifyResult.data.value).toBe(84);
    
    // Delete data
    const deleteResult = await client.callTool('deleteData', { id: dataId });
    expect(deleteResult.success).toBe(true);
    
    // Verify deletion
    await expect(client.callTool('getData', { id: dataId }))
      .rejects.toThrow('Data not found');
  });
  
  it('should handle concurrent requests correctly', async () => {
    const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
      client.callTool('getData', { id: `concurrent-${i}` })
    );
    
    const results = await Promise.allSettled(concurrentRequests);
    
    // すべてのリクエストが処理されることを確認
    expect(results).toHaveLength(10);
    
    // 成功とエラーの適切な処理を確認
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    expect(successful.length + failed.length).toBe(10);
  });
});
```

#### 3. パフォーマンステスト

```typescript
// パフォーマンステストスイート
describe('Performance Tests', () => {
  let server: MCPServer;
  let loadTester: LoadTester;
  
  beforeAll(async () => {
    server = await createProductionLikeServer();
    loadTester = new LoadTester(server);
    await server.start();
  });
  
  afterAll(async () => {
    await server.stop();
  });
  
  it('should handle high concurrent load', async () => {
    const testConfig = {
      concurrentUsers: 100,
      duration: 60000, // 1分
      rampUpTime: 10000, // 10秒
      requestsPerSecond: 50
    };
    
    const results = await loadTester.runLoadTest(testConfig);
    
    // パフォーマンス要件の検証
    expect(results.averageResponseTime).toBeLessThan(200); // 200ms以下
    expect(results.p95ResponseTime).toBeLessThan(500); // 95%ile 500ms以下
    expect(results.errorRate).toBeLessThan(0.01); // エラー率1%以下
    expect(results.throughput).toBeGreaterThan(45); // スループット45req/s以上
  });
  
  it('should maintain performance under memory pressure', async () => {
    const memoryPressureTest = {
      initialMemoryUsage: process.memoryUsage().heapUsed,
      maxMemoryIncrease: 50 * 1024 * 1024, // 50MB
      testDuration: 300000 // 5分
    };
    
    const startTime = Date.now();
    const results = [];
    
    while (Date.now() - startTime < memoryPressureTest.testDuration) {
      const start = performance.now();
      await server.handleRequest(createTestRequest());
      const end = performance.now();
      
      results.push({
        responseTime: end - start,
        memoryUsage: process.memoryUsage().heapUsed
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const maxMemoryUsage = Math.max(...results.map(r => r.memoryUsage));
    const memoryIncrease = maxMemoryUsage - memoryPressureTest.initialMemoryUsage;
    
    expect(avgResponseTime).toBeLessThan(300);
    expect(memoryIncrease).toBeLessThan(memoryPressureTest.maxMemoryIncrease);
  });
});
```

### 4. 継続的インテグレーション設定

```yaml
# .github/workflows/ci.yml
name: MCP Server CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
        
    services:
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
          
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run unit tests
      run: npm run test:unit
      env:
        NODE_ENV: test
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        REDIS_URL: redis://localhost:6379
        DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
    
    - name: Run performance tests
      run: npm run test:performance
      env:
        NODE_ENV: test
    
    - name: Generate coverage report
      run: npm run coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        
  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run security audit
      run: npm audit --audit-level high
      
    - name: Run SAST scan
      uses: github/super-linter@v4
      env:
        VALIDATE_ALL_CODEBASE: false
        DEFAULT_BRANCH: main
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📊 監視とアラート

### 包括的監視システム

```typescript
// 包括的監視とメトリクス収集
class MonitoringSystem {
  private metrics: MetricsCollector;
  private alertManager: AlertManager;
  private healthChecker: HealthChecker;
  
  constructor() {
    this.metrics = new PrometheusMetricsCollector();
    this.alertManager = new AlertManager();
    this.healthChecker = new HealthChecker();
    
    this.setupDefaultMetrics();
    this.setupDefaultAlerts();
  }
  
  private setupDefaultMetrics(): void {
    // リクエストメトリクス
    this.metrics.createCounter('http_requests_total', {
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'status_code', 'endpoint']
    });
    
    this.metrics.createHistogram('http_request_duration_seconds', {
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });
    
    // システムメトリクス
    this.metrics.createGauge('memory_usage_bytes', {
      help: 'Memory usage in bytes'
    });
    
    this.metrics.createGauge('cpu_usage_percent', {
      help: 'CPU usage percentage'
    });
    
    // ビジネスメトリクス
    this.metrics.createCounter('tool_calls_total', {
      help: 'Total number of tool calls',
      labelNames: ['tool_name', 'status']
    });
    
    this.metrics.createHistogram('tool_execution_duration_seconds', {
      help: 'Tool execution duration in seconds',
      labelNames: ['tool_name']
    });
  }
  
  private setupDefaultAlerts(): void {
    // 高エラー率アラート
    this.alertManager.createAlert({
      name: 'HighErrorRate',
      expression: 'rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05',
      duration: '2m',
      severity: 'critical',
      summary: 'High error rate detected',
      description: 'Error rate is above 5% for more than 2 minutes'
    });
    
    // 高レスポンス時間アラート
    this.alertManager.createAlert({
      name: 'HighResponseTime',
      expression: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2',
      duration: '5m',
      severity: 'warning',
      summary: 'High response time detected',
      description: '95th percentile response time is above 2 seconds'
    });
    
    // メモリ使用量アラート
    this.alertManager.createAlert({
      name: 'HighMemoryUsage',
      expression: 'memory_usage_bytes / (1024 * 1024 * 1024) > 2',
      duration: '3m',
      severity: 'warning',
      summary: 'High memory usage detected',
      description: 'Memory usage is above 2GB for more than 3 minutes'
    });
  }
  
  async collectAndReport(): Promise<void> {
    // システムメトリクスの収集
    const memUsage = process.memoryUsage();
    this.metrics.setGauge('memory_usage_bytes', memUsage.heapUsed);
    
    const cpuUsage = await this.getCPUUsage();
    this.metrics.setGauge('cpu_usage_percent', cpuUsage);
    
    // ヘルスチェック
    const healthStatus = await this.healthChecker.checkAll();
    this.metrics.setGauge('health_status', healthStatus.overall ? 1 : 0);
    
    // アラート評価
    await this.alertManager.evaluateAlerts();
  }
  
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();
      
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const elapsedTime = Date.now() - startTime;
        
        const cpuPercent = (currentUsage.user + currentUsage.system) / (elapsedTime * 1000);
        resolve(cpuPercent * 100);
      }, 100);
    });
  }
}
```

---

## 📝 まとめ

### 重要なベストプラクティス

1. **パフォーマンス**: 適切なキャッシング、非同期処理、負荷分散
2. **信頼性**: エラーハンドリング、サーキットブレーカー、冗長性
3. **セキュリティ**: 認証・認可、暗号化、入力検証
4. **品質**: 包括的テスト、継続的インテグレーション、監視

### 継続的改善

- 定期的なパフォーマンス評価
- セキュリティ監査の実施
- ユーザーフィードバックの収集
- 技術スタックの更新

次の章では、具体的なケーススタディを通じて、これらのベストプラクティスがどのように実際のプロジェクトで適用されるかを学習します。

---

**Generated with [Claude Code](https://claude.ai/code)**