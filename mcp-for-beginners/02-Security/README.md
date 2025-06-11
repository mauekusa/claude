# 02 - MCPにおけるセキュリティ

## 📖 概要

この章では、Model Context Protocol (MCP) システムにおけるセキュリティの脅威を特定し、実装を安全にするための技術とベストプラクティスを学習します。MCPは強力な機能を提供しますが、適切なセキュリティ対策なしには重大なリスクを伴います。

## 🎯 学習目標

この章を完了すると、以下のことができるようになります：

- MCPシステムにおける主要なセキュリティ脅威を理解できる
- セキュアなMCP実装のベストプラクティスを適用できる
- 入力検証とサニタイゼーションを実装できる
- 認証と認可のメカニズムを理解できる
- セキュリティ監視とログ記録を設定できる

## ⚠️ セキュリティ脅威の分析

### 1. コード実行の脅威

MCPサーバーは任意のコードを実行する可能性があるため、コードインジェクション攻撃のリスクがあります。

#### 危険な実装例

```javascript
// ❌ 危険：サニタイゼーションなしの直接実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "run_command") {
    // 直接コマンド実行 - 非常に危険！
    const result = exec(args.command);
    return { content: [{ type: "text", text: result }] };
  }
});
```

#### 安全な実装例

```javascript
// ✅ 安全：ホワイトリストと検証を使用
const ALLOWED_COMMANDS = {
  'list_files': 'ls -la',
  'current_date': 'date',
  'disk_usage': 'df -h'
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "run_command") {
    // コマンドのホワイトリストチェック
    if (!ALLOWED_COMMANDS[args.command_name]) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Command not allowed: ${args.command_name}`
      );
    }
    
    const safeCommand = ALLOWED_COMMANDS[args.command_name];
    const result = await execSafe(safeCommand);
    return { content: [{ type: "text", text: result }] };
  }
});

// 安全なコマンド実行
async function execSafe(command) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
```

### 2. ファイルシステムアクセスの脅威

パストラバーサル攻撃により、意図しないファイルにアクセスされる可能性があります。

#### 危険な実装例

```javascript
// ❌ 危険：パストラバーサル脆弱性
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "read_file") {
    // 直接パス使用 - パストラバーサル攻撃が可能
    const content = await fs.readFile(args.path, 'utf8');
    return { content: [{ type: "text", text: content }] };
  }
});
```

#### 安全な実装例

```javascript
// ✅ 安全：パス検証とサンドボックス化
const SAFE_BASE_PATH = '/app/data';

function validatePath(inputPath) {
  // パスの正規化
  const normalizedPath = path.normalize(inputPath);
  
  // 相対パス要素のチェック
  if (normalizedPath.includes('..')) {
    throw new Error('Path traversal detected');
  }
  
  // 絶対パスの構築
  const fullPath = path.resolve(SAFE_BASE_PATH, normalizedPath);
  
  // ベースディレクトリ内かチェック
  if (!fullPath.startsWith(SAFE_BASE_PATH)) {
    throw new Error('Path outside allowed directory');
  }
  
  return fullPath;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "read_file") {
    try {
      const safePath = validatePath(args.path);
      const content = await fs.readFile(safePath, 'utf8');
      return { content: [{ type: "text", text: content }] };
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid file path: ${error.message}`
      );
    }
  }
});
```

### 3. データ漏洩の脅威

機密データが意図せずに露出する可能性があります。

#### データのサニタイゼーション

```javascript
// 機密データのフィルタリング
function sanitizeData(data) {
  const sensitivePatterns = [
    /password\s*[:=]\s*\S+/gi,
    /api[_-]?key\s*[:=]\s*\S+/gi,
    /secret\s*[:=]\s*\S+/gi,
    /token\s*[:=]\s*\S+/gi,
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g // クレジットカード番号
  ];
  
  let sanitized = data;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[機密データ]');
  });
  
  return sanitized;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "search_logs") {
    const logs = await readLogFile(args.logFile);
    const sanitizedLogs = sanitizeData(logs);
    
    return { 
      content: [{ 
        type: "text", 
        text: sanitizedLogs 
      }] 
    };
  }
});
```

## 🔐 認証と認可

### 1. APIキーベースの認証

```javascript
import crypto from 'crypto';

class AuthenticationManager {
  constructor() {
    this.validKeys = new Set(process.env.MCP_API_KEYS?.split(',') || []);
    this.keyUsage = new Map(); // 使用頻度の追跡
  }
  
  authenticateClient(apiKey) {
    if (!apiKey) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'API key required'
      );
    }
    
    if (!this.validKeys.has(apiKey)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid API key'
      );
    }
    
    // 使用回数を追跡
    const usage = this.keyUsage.get(apiKey) || 0;
    this.keyUsage.set(apiKey, usage + 1);
    
    return true;
  }
  
  checkRateLimit(apiKey, maxRequests = 100, timeWindow = 3600000) {
    const now = Date.now();
    const key = `${apiKey}_${Math.floor(now / timeWindow)}`;
    const count = this.keyUsage.get(key) || 0;
    
    if (count >= maxRequests) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Rate limit exceeded'
      );
    }
    
    this.keyUsage.set(key, count + 1);
  }
}

// 使用例
const authManager = new AuthenticationManager();

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // 認証チェック
  const apiKey = request.meta?.apiKey;
  authManager.authenticateClient(apiKey);
  authManager.checkRateLimit(apiKey);
  
  // 実際の処理
  return await handleToolCall(request);
});
```

### 2. 役割ベースのアクセス制御 (RBAC)

```javascript
class RoleBasedAccessControl {
  constructor() {
    this.roles = {
      'viewer': ['read_file', 'list_resources'],
      'editor': ['read_file', 'write_file', 'list_resources'],
      'admin': ['*'] // 全権限
    };
  }
  
  checkPermission(userRole, toolName) {
    const permissions = this.roles[userRole];
    if (!permissions) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown role: ${userRole}`
      );
    }
    
    // 管理者は全ての権限を持つ
    if (permissions.includes('*')) {
      return true;
    }
    
    // 特定のツールが許可されているかチェック
    if (!permissions.includes(toolName)) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Access denied for tool: ${toolName}`
      );
    }
    
    return true;
  }
}

// 使用例
const rbac = new RoleBasedAccessControl();

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const userRole = request.meta?.userRole || 'viewer';
  
  // 権限チェック
  rbac.checkPermission(userRole, name);
  
  // 実際の処理
  return await handleToolCall(request);
});
```

## 🛡️ 入力検証とサニタイゼーション

### 1. スキーマベースの検証

```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

// ツール入力の厳密なスキーマ定義
const toolSchemas = {
  read_file: {
    type: "object",
    properties: {
      path: {
        type: "string",
        pattern: "^[a-zA-Z0-9._/-]+$", // 安全な文字のみ
        maxLength: 255
      }
    },
    required: ["path"],
    additionalProperties: false
  },
  
  search_database: {
    type: "object",
    properties: {
      query: {
        type: "string",
        maxLength: 1000
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100
      }
    },
    required: ["query"],
    additionalProperties: false
  }
};

function validateToolInput(toolName, input) {
  const schema = toolSchemas[toolName];
  if (!schema) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${toolName}`
    );
  }
  
  const validate = ajv.compile(schema);
  const valid = validate(input);
  
  if (!valid) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid input: ${ajv.errorsText(validate.errors)}`
    );
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // 入力検証
  validateToolInput(name, args);
  
  // 処理続行
  return await handleToolCall(request);
});
```

### 2. SQLインジェクション防止

```javascript
import mysql from 'mysql2/promise';

class SecureDatabase {
  constructor(connectionConfig) {
    this.pool = mysql.createPool({
      ...connectionConfig,
      ssl: { rejectUnauthorized: true },
      acquireTimeout: 10000,
      timeout: 10000
    });
  }
  
  // ✅ 安全：プリペアドステートメント使用
  async searchUsers(searchTerm, limit = 10) {
    const query = `
      SELECT id, name, email 
      FROM users 
      WHERE name LIKE ? 
      LIMIT ?
    `;
    
    const [rows] = await this.pool.execute(query, [
      `%${searchTerm}%`,
      limit
    ]);
    
    return rows;
  }
  
  // ❌ 危険：SQLインジェクション脆弱性のある例
  async unsafeSearch(searchTerm) {
    const query = `SELECT * FROM users WHERE name = '${searchTerm}'`;
    // この実装は使用しないでください！
    throw new Error('Unsafe method - do not use');
  }
}

// 使用例
const db = new SecureDatabase({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "search_users") {
    const results = await db.searchUsers(args.search, args.limit);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(results, null, 2)
      }]
    };
  }
});
```

## 📊 セキュリティ監視とログ記録

### 1. 包括的なログ記録

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class SecurityLogger {
  static logToolCall(toolName, args, clientInfo, result) {
    logger.info('Tool called', {
      tool: toolName,
      arguments: this.sanitizeLogData(args),
      client: clientInfo,
      timestamp: new Date().toISOString(),
      success: !!result
    });
  }
  
  static logSecurityEvent(eventType, details, severity = 'warning') {
    logger.log(severity, 'Security event', {
      type: eventType,
      details: this.sanitizeLogData(details),
      timestamp: new Date().toISOString()
    });
  }
  
  static sanitizeLogData(data) {
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // 機密情報をマスク
    const sensitiveKeys = ['password', 'token', 'key', 'secret'];
    
    function maskSensitive(obj) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          maskSensitive(value);
        } else if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          obj[key] = '[REDACTED]';
        }
      }
    }
    
    maskSensitive(sanitized);
    return sanitized;
  }
}
```

### 2. 異常検出

```javascript
class AnomalyDetector {
  constructor() {
    this.requestCounts = new Map();
    this.suspiciousPatterns = [
      /\.\.\//, // パストラバーサル
      /\bUNION\b/i, // SQLインジェクション
      /\bSELECT\b.*\bFROM\b/i, // SQL文
      /<script/i, // XSS
      /eval\s*\(/i // コード実行
    ];
  }
  
  checkRequest(toolName, args, clientId) {
    // 頻度ベースの異常検出
    this.checkRequestFrequency(clientId);
    
    // パターンベースの異常検出
    this.checkSuspiciousPatterns(args);
    
    // ツール使用パターンの異常検出
    this.checkToolUsagePattern(toolName, clientId);
  }
  
  checkRequestFrequency(clientId) {
    const now = Date.now();
    const windowStart = now - 60000; // 1分間のウィンドウ
    
    const key = `${clientId}_${Math.floor(now / 60000)}`;
    const count = this.requestCounts.get(key) || 0;
    
    if (count > 100) { // 1分間に100リクエスト以上
      SecurityLogger.logSecurityEvent('high_frequency_requests', {
        clientId,
        count,
        timeWindow: '1min'
      }, 'error');
      
      throw new McpError(
        ErrorCode.InvalidParams,
        'Suspicious request frequency detected'
      );
    }
    
    this.requestCounts.set(key, count + 1);
  }
  
  checkSuspiciousPatterns(args) {
    const argsString = JSON.stringify(args);
    
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(argsString)) {
        SecurityLogger.logSecurityEvent('suspicious_pattern', {
          pattern: pattern.toString(),
          input: argsString.substring(0, 100) // 最初の100文字のみ
        }, 'error');
        
        throw new McpError(
          ErrorCode.InvalidParams,
          'Suspicious input pattern detected'
        );
      }
    }
  }
}

const anomalyDetector = new AnomalyDetector();

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const clientId = request.meta?.clientId || 'unknown';
  
  try {
    // 異常検出
    anomalyDetector.checkRequest(name, args, clientId);
    
    // 処理実行
    const result = await handleToolCall(request);
    
    // 成功ログ
    SecurityLogger.logToolCall(name, args, { clientId }, result);
    
    return result;
    
  } catch (error) {
    // エラーログ
    SecurityLogger.logSecurityEvent('tool_call_failed', {
      tool: name,
      args,
      clientId,
      error: error.message
    }, 'error');
    
    throw error;
  }
});
```

## 🔧 セキュリティ設定のベストプラクティス

### 1. 環境変数による設定管理

```javascript
// .env ファイル（本番環境では使用しない）
MCP_API_KEYS=key1,key2,key3
DB_PASSWORD=secure_password
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=https://trusted-domain.com

// 設定の読み込み
const config = {
  apiKeys: process.env.MCP_API_KEYS?.split(',') || [],
  dbPassword: process.env.DB_PASSWORD,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
  
  // デフォルト値の設定
  sessionTimeout: 3600000, // 1時間
  maxFileSize: 10 * 1024 * 1024, // 10MB
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
};
```

### 2. HTTPSとTLS設定

```javascript
import https from 'https';
import fs from 'fs';

// 本番環境でのHTTPS設定
const httpsOptions = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  
  // 強力なTLS設定
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
  secureProtocol: 'TLSv1_2_method',
  minVersion: 'TLSv1.2'
};

const server = https.createServer(httpsOptions, app);
```

### 3. CORS設定

```javascript
import cors from 'cors';

const corsOptions = {
  origin: function (origin, callback) {
    // 許可されたオリジンのチェック
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

## 🧪 セキュリティテスト

### 1. 脆弱性テストの自動化

```javascript
// テストスイート例
describe('Security Tests', () => {
  test('should reject path traversal attempts', async () => {
    const maliciousPath = '../../../etc/passwd';
    
    await expect(
      client.callTool('read_file', { path: maliciousPath })
    ).rejects.toThrow('Path traversal detected');
  });
  
  test('should reject SQL injection attempts', async () => {
    const maliciousQuery = "'; DROP TABLE users; --";
    
    await expect(
      client.callTool('search_database', { query: maliciousQuery })
    ).rejects.toThrow('Suspicious input pattern detected');
  });
  
  test('should enforce rate limiting', async () => {
    // 多数のリクエストを並行して送信
    const requests = Array(150).fill().map(() => 
      client.callTool('simple_tool', {})
    );
    
    await expect(
      Promise.all(requests)
    ).rejects.toThrow('Rate limit exceeded');
  });
});
```

## 🎉 まとめ

MCPシステムのセキュリティは多層防御が重要です：

### 主要なセキュリティ対策

1. **入力検証**: 厳密なスキーマとパターンチェック
2. **認証・認可**: APIキー、RBAC、レート制限
3. **データ保護**: サニタイゼーション、暗号化
4. **監視**: 包括的なログ記録と異常検出
5. **インフラ**: HTTPS、適切なCORS設定

### セキュリティチェックリスト

- [ ] 全ての入力に対して厳密な検証を実装
- [ ] APIキーによる認証を設定
- [ ] 役割ベースのアクセス制御を実装
- [ ] レート制限を設定
- [ ] 機密データのサニタイゼーションを実装
- [ ] 包括的なログ記録を設定
- [ ] 異常検出メカニズムを実装
- [ ] HTTPS/TLSを設定
- [ ] セキュリティテストを自動化

## 🔗 次のステップ

**[03-GettingStarted](../03-GettingStarted/)** に進んで、実際にセキュアなMCPサーバーとクライアントの構築を始めましょう。

## 📚 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JSON-RPC Security Considerations](https://www.jsonrpc.org/historical/json-rpc-1-2-proposal.html#security)

---

*セキュリティは実装の始めから考慮することが重要です。後から追加するのではなく、設計段階から組み込みましょう。*