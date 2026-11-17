import { FileCheckSuggestion, LogCategory, LogDiagnosis, LogEntry, ParsedLogResult } from '../types/log';

interface DiagnosticRule {
  id: string;
  pattern: RegExp;
  summary: string;
  diagnosticGroup: string;
  possibleCauses: string[];
  recommendedFiles: FileCheckSuggestion[];
}

const DIAGNOSTIC_RULES: DiagnosticRule[] = [
  {
    id: 'db-conn-refused',
    pattern: /(econnrefused|connection refused|could not connect to.*(postgres|mysql|redis|mongo|database)|db.*connect.*fail|connect ECONNREFUSED)/i,
    summary: '資料庫或內部服務連線被拒',
    diagnosticGroup: '資料庫與連線',
    possibleCauses: [
      '目標資料庫或快取服務（PostgreSQL / MySQL / Redis）尚未啟動，或程序已意外終止。',
      '環境變數中的連線主機名稱、通訊埠（Port）或連線字串設定與實際部署環境不一致。',
      '防火牆規則、Docker 網路隔離或本機 VPC 安全群組阻擋了服務之間的 TCP 連線。',
    ],
    recommendedFiles: [
      { path: '.env', reason: '確認 DATABASE_URL、REDIS_URL 與對應埠號設定是否正確' },
      { path: 'docker-compose.yml', reason: '檢查服務容器名稱、depends_on 啟動順序與 port 映射' },
      { path: 'src/db/index.ts', reason: '檢查資料庫連線池初始化邏輯與重試機制' },
    ],
  },
  {
    id: 'port-in-use',
    pattern: /(eaddrinuse|address already in use|port \d+ is already in use|listen EADDRINUSE)/i,
    summary: '通訊埠（Port）已被其他程序佔用',
    diagnosticGroup: '網路與服務啟動',
    possibleCauses: [
      '先前啟動的伺服器實例未正常關閉，仍在背景持續佔用相同埠號。',
      '本機同時運行了另一個使用相同預設埠號（例如 3000、5432、8080）的開發服務。',
      '熱重載或守護行程在舊程序尚未釋放 socket 前即觸發重新綁定。',
    ],
    recommendedFiles: [
      { path: 'server.ts', reason: '確認監聽埠號設定及 SIGTERM / SIGINT 優雅關閉處理' },
      { path: 'package.json', reason: '檢查 dev / start 啟動腳本指定的 port 參數' },
      { path: '.env', reason: '確認 PORT 環境變數是否與其他本機服務衝突' },
    ],
  },
  {
    id: 'missing-file-module',
    pattern: /(enoent|no such file or directory|cannot find module|module_not_found|err_module_not_found|failed to resolve import|filenotfounderror)/i,
    summary: '找不到指定的檔案、路徑或相依套件',
    diagnosticGroup: '檔案系統與相依套件',
    possibleCauses: [
      '路徑拼寫錯誤、大小寫不一致（Linux 環境區分大小寫），或相對路徑基準目錄不正確。',
      '相依套件尚未安裝完整，或 node_modules / 虛擬環境與 lockfile 狀態不同步。',
      '建置產物（如 dist / build 目錄）尚未生成，導致執行時期讀取靜態資源失敗。',
    ],
    recommendedFiles: [
      { path: 'package.json', reason: '確認遺失模組是否已列於 dependencies 且版本正確' },
      { path: 'tsconfig.json', reason: '檢查 paths 別名與 baseUrl 設定是否與實際目錄吻合' },
      { path: 'vite.config.ts', reason: '確認 resolve.alias 與靜態資源複製規則設定' },
    ],
  },
  {
    id: 'permission-denied',
    pattern: /(eacces|eperm|permission denied|unauthorized access|access denied|403 forbidden|forbidden)/i,
    summary: '存取權限不足或驗證授權遭拒',
    diagnosticGroup: '權限與身分驗證',
    possibleCauses: [
      '執行程式的系統帳號缺少讀取或寫入目標目錄、憑證檔或系統埠的權限。',
      'API 金鑰、Bearer Token 或使用者會話權杖已過期、失效或權限範圍（Scope）不足。',
      '檔案系統權限（chmod / chown）或反向代理（Nginx / IAM）阻擋了存取請求。',
    ],
    recommendedFiles: [
      { path: 'src/middleware/auth.ts', reason: '檢查權杖驗證邏輯、角色權限判斷與白名單設定' },
      { path: '.env', reason: '確認 API 金鑰、密鑰或服務帳號憑證是否正確載入' },
      { path: 'nginx.conf', reason: '檢視反向代理存取控制與標頭轉發規則' },
    ],
  },
  {
    id: 'auth-401',
    pattern: /(401 unauthorized|invalid token|jwt expired|token expired|authentication failed|unauthenticated|invalid signature)/i,
    summary: '身分驗證失敗或權杖（JWT / Session）失效',
    diagnosticGroup: '權限與身分驗證',
    possibleCauses: [
      'JWT Token 已超過有效期限（exp），或前後端系統時鐘不同步。',
      '簽章密鑰（JWT_SECRET / OAuth Client Secret）在環境間切換時未保持一致。',
      '請求標頭未正確帶入 Authorization: Bearer <token> 或 Cookie 被瀏覽器擋下。',
    ],
    recommendedFiles: [
      { path: 'src/services/auth.ts', reason: '確認 Token 簽發、刷新（Refresh）與過期時間邏輯' },
      { path: '.env', reason: '核對 JWT_SECRET、OAUTH_CLIENT_SECRET 等機密設定' },
      { path: 'src/api/client.ts', reason: '檢查前端請求攔截器是否正確附加驗證標頭' },
    ],
  },
  {
    id: 'timeout-gateway',
    pattern: /(etimedout|timeout|timed out|504 gateway|502 bad gateway|upstream.*timed out|socket hang up|esockettimedout|deadline exceeded)/i,
    summary: '網路請求逾時或上游閘道器無回應',
    diagnosticGroup: '網路與連線',
    possibleCauses: [
      '上游 API 或第三方服務回應過慢，超過客戶端或反向代理設定的 timeout 閾值。',
      '資料庫查詢缺少索引或發生資料表鎖死（Lock），導致後端處理執行緒長時間卡住。',
      'DNS 解析延遲、網路封包遺失或連線池耗盡使新請求無法取得連線。',
    ],
    recommendedFiles: [
      { path: 'nginx.conf', reason: '檢查 proxy_read_timeout 與 proxy_connect_timeout 秒數設定' },
      { path: 'src/api/client.ts', reason: '調整 HTTP 請求逾時時間與重試退避策略' },
      { path: 'src/db/queries.ts', reason: '檢視耗時 SQL 查詢與交易鎖定範圍' },
    ],
  },
  {
    id: 'oom-memory',
    pattern: /(out of memory|outofmemoryerror|heap out of memory|javascript heap|allocation failed|memory usage|high memory|oom-killer|enomem)/i,
    summary: '記憶體用量過高或發生記憶體溢位（OOM）',
    diagnosticGroup: '記憶體與資源效能',
    possibleCauses: [
      '存在記憶體洩漏（Memory Leak），例如未清除的事件監聽器、全域快取無限增長或閉包殘留。',
      '單次載入過大檔案或查詢過多資料列至記憶體中，未採用串流（Stream）或分頁處理。',
      'Node.js / JVM 預設堆疊上限（如 --max-old-space-size）低於實際工作負載需求。',
    ],
    recommendedFiles: [
      { path: 'package.json', reason: '檢查啟動腳本是否需設定 NODE_OPTIONS="--max-old-space-size=4096"' },
      { path: 'src/services/cache.ts', reason: '確認記憶體快取是否有設定上限（TTL / LRU 淘汰）' },
      { path: 'Dockerfile', reason: '檢查容器記憶體限制（limits.memory）配置' },
    ],
  },
  {
    id: 'disk-space',
    pattern: /(enospc|no space left on device|disk full|disk usage.*(high|critical|exceed)|storage quota)/i,
    summary: '磁碟空間不足或即將達到容量上限',
    diagnosticGroup: '系統儲存資源',
    possibleCauses: [
      '日誌檔長期未進行輪替（Log Rotation）與壓縮清理，佔滿磁碟分割區。',
      '暫存檔（/tmp）、上傳檔案或舊版容器映像檔累積過多未釋放。',
      '資料庫 WAL / binlog 或快取目錄成長超出預期配額。',
    ],
    recommendedFiles: [
      { path: '/etc/logrotate.conf', reason: '設定日誌自動切割、壓縮與保留天數' },
      { path: 'docker-compose.yml', reason: '檢查掛載磁碟（volumes）與日誌驅動 max-size 限制' },
      { path: 'src/utils/storage.ts', reason: '確認檔案上傳大小限制與暫存清理機制' },
    ],
  },
  {
    id: 'ssl-tls',
    pattern: /(ssl|tls|cert_|certificate|self-signed|unable to verify the first certificate|err_tls|cert has expired|x509)/i,
    summary: 'SSL / TLS 憑證驗證失敗或憑證已過期',
    diagnosticGroup: '網路與安全憑證',
    possibleCauses: [
      '伺服器或第三方端點的 SSL 憑證已過期，尚未更新續期（例如 Let’s Encrypt）。',
      '內部環境使用自簽憑證（Self-signed），但執行環境未信任對應的 Root CA 憑證鏈。',
      '憑證中繼檔（Intermediate Chain）缺漏或網域主機名稱（SAN / CN）與連線網址不符。',
    ],
    recommendedFiles: [
      { path: 'nginx.conf', reason: '檢查 ssl_certificate 與 ssl_certificate_key 路徑與完整憑證鏈' },
      { path: '.env', reason: '確認 NODE_EXTRA_CA_CERTS 或自訂憑證路徑設定' },
      { path: 'certbot/renewal.conf', reason: '確認憑證自動續期排程是否正常執行' },
    ],
  },
  {
    id: 'rate-limit',
    pattern: /(429 too many requests|rate limit|ratelimit|quota exceeded|throttl|too many requests)/i,
    summary: '觸發 API 請求頻率限制（Rate Limit）',
    diagnosticGroup: '流量控制與配額',
    possibleCauses: [
      '短時間內對外部 API 或資料庫發出過多併發請求，超過配額上限。',
      '前端輪詢（Polling）間隔過短或錯誤重試迴圈缺乏指數退避（Exponential Backoff）。',
      '自動化腳本或異常流量集中打向單一端點。',
    ],
    recommendedFiles: [
      { path: 'src/api/client.ts', reason: '實作請求節流（Throttle）與 429 指數退避重試' },
      { path: 'src/middleware/rateLimit.ts', reason: '檢視伺服器限流窗口與白名單規則' },
      { path: 'src/hooks/usePolling.ts', reason: '確認前景輪詢頻率與元件卸載時是否清理計時器' },
    ],
  },
  {
    id: 'json-syntax-parse',
    pattern: /(syntaxerror|unexpected token|json\.parse|invalid json|yaml.*error|parse error|unterminated string)/i,
    summary: 'JSON / 設定檔或程式碼語法解析失敗',
    diagnosticGroup: '資料格式與語法',
    possibleCauses: [
      'API 回傳了非預期的 HTML 錯誤頁面（如 502 網頁）或空字串，卻直接呼叫 JSON.parse()。',
      '設定檔（JSON / YAML / .env）含有多餘逗號、未閉合引號或縮排錯誤。',
      '編碼格式非 UTF-8（例如含 BOM 字元）導致解析器讀取失敗。',
    ],
    recommendedFiles: [
      { path: 'src/api/client.ts', reason: '在解析 JSON 前先檢查 response.ok 與 Content-Type 標頭' },
      { path: 'package.json', reason: '確認設定檔語法與欄位結構是否合法' },
      { path: 'tsconfig.json', reason: '驗證 JSON 格式無尾隨逗號或非法註解' },
    ],
  },
  {
    id: 'null-typeerror',
    pattern: /(typeerror|cannot read propert|cannot read properties of (undefined|null)|undefined is not|nullpointerexception|attributeerror: 'nonetype'|referenceerror)/i,
    summary: '存取了未定義（undefined / null）的物件屬性或函式',
    diagnosticGroup: '程式執行期型別錯誤',
    possibleCauses: [
      '非同步資料尚未載入完成前，元件或函式即嘗試讀取深層嵌套屬性。',
      'API 回應結構變更或欄位為選填，程式中缺少可選鏈（?.）與空值防呆判斷。',
      '變數作用域錯誤或函式在特定分支下未回傳預期物件。',
    ],
    recommendedFiles: [
      { path: 'src/App.tsx', reason: '確認資料初始化預設值與載入狀態條件渲染' },
      { path: 'src/types/index.ts', reason: '對齊後端 API 回傳的型別定義與可選欄位標記' },
      { path: 'tsconfig.json', reason: '確認 strictNullChecks 已啟用以在編譯期捕捉空值風險' },
    ],
  },
  {
    id: 'sql-db-error',
    pattern: /(sql|sqlite_|ora-|pg::|unique constraint|foreign key constraint|deadlock|slow query|query took \d+ms|duplicate entry|relation .* does not exist)/i,
    summary: '資料庫查詢異常、約束衝突或慢查詢警告',
    diagnosticGroup: '資料庫與連線',
    possibleCauses: [
      '資料表結構（Migration）尚未執行或與程式碼中的 Schema 定義不同步。',
      '寫入資料違反唯一鍵（Unique）或外鍵（Foreign Key）完整性約束。',
      '查詢缺少適當索引造成全表掃描，引起慢查詢警告或交易死鎖。',
    ],
    recommendedFiles: [
      { path: 'src/db/schema.ts', reason: '核對資料表欄位定義、索引與關聯外鍵' },
      { path: 'drizzle.config.ts', reason: '確認遷移檔案路徑與資料庫連線配置' },
      { path: 'src/db/queries.ts', reason: '最佳化慢查詢 SQL 與重複鍵寫入處理（ON CONFLICT）' },
    ],
  },
  {
    id: 'http-404',
    pattern: /(404 not found|route not found|cannot (get|post|put|delete) \/|endpoint not found)/i,
    summary: '請求的 API 端點或靜態資源路徑不存在（404）',
    diagnosticGroup: '路由與端點設定',
    possibleCauses: [
      '前端呼叫的 API 路徑與後端註冊的路由前綴（例如 /api/v1）不一致。',
      'HTTP 方法（GET / POST / PUT）與後端路由定義不符。',
      '單頁式應用（SPA）重新整理時，伺服器未設定 fallback 回傳 index.html。',
    ],
    recommendedFiles: [
      { path: 'server.ts', reason: '核對 Express 路由掛載路徑與 SPA fallback 設定' },
      { path: 'vite.config.ts', reason: '確認開發伺服器 proxy 代理轉發路徑設定' },
      { path: 'src/api/endpoints.ts', reason: '檢查前端請求 URL 拼寫與版本前綴' },
    ],
  },
  {
    id: 'http-500',
    pattern: /(500 internal server error|status[:= ]+500|unhandled exception|internal error|crash|panic:)/i,
    summary: '伺服器發生未捕捉的內部例外錯誤（500）',
    diagnosticGroup: '伺服器執行期異常',
    possibleCauses: [
      '後端路由處理函式在執行商業邏輯時拋出未捕捉例外（Unhandled Exception）。',
      '外部依賴服務回傳錯誤格式，導致伺服器序列化或寫入回應時崩潰。',
      '關鍵環境變數遺失（例如第三方 API Key 未設定），引發初始化失敗。',
    ],
    recommendedFiles: [
      { path: 'server.ts', reason: '檢查全域錯誤處理中介軟體（Error Handler Middleware）與堆疊記錄' },
      { path: '.env.example', reason: '對照所有必要環境變數是否已在正式環境設定齊全' },
      { path: 'src/routes/index.ts', reason: '檢視對應端點的 try/catch 與輸入參數驗證' },
    ],
  },
  {
    id: 'cors-policy',
    pattern: /(cors|access-control-allow-origin|cross-origin|preflight)/i,
    summary: '跨來源資源共用（CORS）原則阻擋請求',
    diagnosticGroup: '瀏覽器安全與跨域設定',
    possibleCauses: [
      '後端回應標頭缺少 Access-Control-Allow-Origin 或未包含目前前端網域。',
      '預檢請求（OPTIONS Preflight）未正確回傳 204/200 或允許的自訂標頭（如 Authorization）。',
      '跨域請求攜帶 Cookie（credentials: include）時，Allow-Origin 使用了萬用字元 * 而非明確網域。',
    ],
    recommendedFiles: [
      { path: 'server.ts', reason: '檢查 cors() 中介軟體的 origin、methods 與 credentials 設定' },
      { path: 'nginx.conf', reason: '確認反向代理未覆寫或遺漏 CORS 回應標頭' },
      { path: 'vite.config.ts', reason: '確認本機開發環境是否已設定 server.proxy 避免跨域' },
    ],
  },
  {
    id: 'deprecation-retry',
    pattern: /(deprecated|legacy|will be removed|retry|retrying|attempt \d+|fallback|cache miss|slow|high latency)/i,
    summary: '系統發佈棄用通知、重試或效能降級警告',
    diagnosticGroup: '效能與相容性警告',
    possibleCauses: [
      '程式仍呼叫舊版 API 或即將汰除的套件方法，未來升級時可能失效。',
      '暫時性網路抖動或快取未命中（Cache Miss）觸發自動重試或降級路徑。',
      '回應延遲接近警示門檻，建議提前檢查外部依賴或資料庫負載。',
    ],
    recommendedFiles: [
      { path: 'package.json', reason: '檢視過時或含棄用警告的相依套件版本' },
      { path: 'src/services/retry.ts', reason: '確認重試次數上限與降級備援邏輯' },
      { path: 'tsconfig.json', reason: '檢查編譯器選項與標記為 @deprecated 的函式呼叫' },
    ],
  },
];

const FILE_PATH_REGEX = /(?:^|[\s("'\[=])((?:[A-Za-z]:\\|\.{1,2}\/|\/)?(?:[\w.-]+[\/\\])+[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|java|rb|php|rs|cs|cpp|c|h|json|ya?ml|env|conf|ini|toml|sql|css|html|log|txt|pem|crt|key|sh)(?::\d+(?::\d+)?)?)/g;
const STANDALONE_FILE_REGEX = /(?:^|[\s("'\[=])((?:package\.json|tsconfig\.json|vite\.config\.\w+|docker-compose\.ya?ml|Dockerfile|\.env(?:\.\w+)?|nginx\.conf|server\.ts|main\.\w+|app\.\w+)(?::\d+(?::\d+)?)?)/g;
const PYTHON_FILE_REGEX = /File\s+"([^"]+)",\s+line\s+(\d+)/g;

export function extractFilePaths(text: string): string[] {
  const found = new Set<string>();

  for (const match of text.matchAll(PYTHON_FILE_REGEX)) {
    const file = match[1];
    const line = match[2];
    if (file && !file.startsWith('http')) {
      found.add(`${file}:${line}`);
    }
  }

  for (const match of text.matchAll(FILE_PATH_REGEX)) {
    const candidate = match[1]?.trim();
    if (
      candidate &&
      !candidate.startsWith('http://') &&
      !candidate.startsWith('https://') &&
      !candidate.includes('node_modules/')
    ) {
      found.add(candidate);
    }
  }

  for (const match of text.matchAll(STANDALONE_FILE_REGEX)) {
    const candidate = match[1]?.trim();
    if (candidate) {
      found.add(candidate);
    }
  }

  return Array.from(found).slice(0, 6);
}

export function buildDiagnosis(rawText: string, category: 'error' | 'warning'): LogDiagnosis {
  const extractedPaths = extractFilePaths(rawText);
  const matchedRule = DIAGNOSTIC_RULES.find((rule) => rule.pattern.test(rawText));

  const extractedSuggestions: FileCheckSuggestion[] = extractedPaths.map((p) => ({
    path: p,
    reason: '日誌或堆疊追蹤中直接指出的來源檔案位置',
    extractedFromLog: true,
  }));

  if (matchedRule) {
    const existingSet = new Set(extractedSuggestions.map((item) => item.path.split(':')[0]));
    const mergedFiles = [
      ...extractedSuggestions,
      ...matchedRule.recommendedFiles.filter((rec) => !existingSet.has(rec.path)),
    ];

    return {
      summary: matchedRule.summary,
      diagnosticGroup: matchedRule.diagnosticGroup,
      possibleCauses: matchedRule.possibleCauses,
      filesToCheck: mergedFiles.slice(0, 5),
    };
  }

  if (category === 'error') {
    return {
      summary: '執行過程發生錯誤或非預期異常',
      diagnosticGroup: '一般錯誤診斷',
      possibleCauses: [
        '目標模組在執行業務邏輯或資料轉換時收到無效輸入或非預期狀態。',
        '必要環境變數、外部服務連線或設定參數在啟動時未正確載入。',
        '請核對下方日誌堆疊（Stack Trace）第一行指出的函式與行號以定位問題根源。',
      ],
      filesToCheck:
        extractedSuggestions.length > 0
          ? extractedSuggestions
          : [
              { path: 'server.ts', reason: '檢查應用程式主進入點與錯誤處理流程' },
              { path: '.env', reason: '確認必要環境設定與金鑰是否齊全' },
              { path: 'package.json', reason: '確認執行腳本與核心套件相依性' },
            ],
    };
  }

  return {
    summary: '偵測到潛在風險或效能降級警告',
    diagnosticGroup: '一般系統警告',
    possibleCauses: [
      '系統雖然仍可繼續運作，但偵測到設定不一致、資源接近上限或備援降級行為。',
      '部分外部呼叫回應偏慢或使用了舊版介面，建議於近期排程檢查並排除隱患。',
    ],
    filesToCheck:
      extractedSuggestions.length > 0
        ? extractedSuggestions
        : [
            { path: 'src/config/index.ts', reason: '檢查預設參數、閾值與警告門檻設定' },
            { path: '.env', reason: '確認環境設定檔是否有遺漏的可選參數' },
          ],
  };
}

const TIMESTAMP_REGEX = /^(\[?\d{4}[-/]\d{2}[-/]\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\]?|\[?\d{2}:\d{2}:\d{2}(?:\.\d+)?\]?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/;

function extractTimestampAndBody(line: string): { timestamp?: string; body: string } {
  const match = line.match(TIMESTAMP_REGEX);
  if (!match) {
    return { body: line };
  }
  const rawTs = match[1].replace(/^\[|\]$/g, '');
  const rest = line.slice(match[0].length).replace(/^[\s\-|:]+/, '');
  return { timestamp: rawTs, body: rest || line };
}

function classifyLine(line: string): { category: LogCategory; levelLabel: string } {
  const upper = line.toUpperCase();

  // 1. Explicit Error / Failure patterns
  if (
    /\[(ERROR|FATAL|CRITICAL|ERR|FAIL|FAILURE|PANIC)\]/.test(upper) ||
    /\b(ERROR|FATAL|CRITICAL|EXCEPTION|TRACEBACK|UNHANDLED|SEGFAULT|PANIC|ECONNREFUSED|ETIMEDOUT|ENOENT|EACCES|EPERM|EADDRINUSE|ENOSPC|ERR_[A-Z0-9_]+|TYPEERROR|SYNTAXERROR|REFERENCEERROR|RANGEERROR|OUTOFMEMORYERROR|NPM ERR!)\b/.test(
      upper
    ) ||
    /\s50[0-4]\s/.test(line) ||
    /(HTTP\/\d\.\d"\s+5\d{2}|STATUS[:= ]+5\d{2}|EXIT CODE [1-9]|BUILD FAILED|FAILED TO|錯誤[:：\s]|失敗|崩潰|無法連線|例外狀況)/.test(
      upper
    )
  ) {
    const levelMatch = upper.match(/\b(FATAL|CRITICAL|ERROR|ERR|EXCEPTION|PANIC)\b/);
    return {
      category: 'error',
      levelLabel: levelMatch ? levelMatch[1] : '錯誤',
    };
  }

  // 2. Explicit Warning patterns
  if (
    /\[(WARN|WARNING)\]/.test(upper) ||
    /\b(WARN|WARNING|DEPRECATED|RATE LIMIT|THROTTL|SLOW QUERY|RETRYING|FALLBACK|CACHE MISS|HIGH MEMORY|DISK USAGE)\b/.test(
      upper
    ) ||
    /\s4(?:00|01|03|04|08|29)\s/.test(line) ||
    /(HTTP\/\d\.\d"\s+4\d{2}|STATUS[:= ]+4\d{2}|警告|注意|逾時重試|降級)/.test(upper)
  ) {
    const levelMatch = upper.match(/\b(WARNING|WARN|DEPRECATED)\b/);
    return {
      category: 'warning',
      levelLabel: levelMatch ? levelMatch[1] : '警告',
    };
  }

  // 3. Explicit Success patterns
  if (
    /\[(SUCCESS|OK|PASS|PASSED|DONE)\]/.test(upper) ||
    /\b(SUCCESS|SUCCEEDED|SUCCESSFULLY|PASSED|COMPLETED|200 OK|201 CREATED|204 NO CONTENT|CONNECTED TO|LISTENING ON|SERVER STARTED|READY IN|DONE IN|BUILD SUCCEEDED|DEPLOYED)\b/.test(
      upper
    ) ||
    /HTTP\/\d\.\d"\s+2\d{2}/.test(upper) ||
    /(成功|完成|已啟動|連線正常|通過驗證|部署完成)/.test(line)
  ) {
    const levelMatch = upper.match(/\b(SUCCESS|OK|PASS|PASSED|COMPLETED)\b/);
    return {
      category: 'success',
      levelLabel: levelMatch ? levelMatch[1] : '成功',
    };
  }

  // 4. Other (INFO, DEBUG, TRACE, plain text)
  const otherLevel = upper.match(/\[(INFO|DEBUG|TRACE|LOG|NOTICE)\]/)?.[1] || upper.match(/^\s*(INFO|DEBUG|TRACE)\b/)?.[1];
  return {
    category: 'other',
    levelLabel: otherLevel || '一般',
  };
}

function isContinuationLine(line: string, prevEntry: LogEntry | null): boolean {
  if (!prevEntry) return false;
  if (TIMESTAMP_REGEX.test(line.trim())) return false;
  if (/^\[(INFO|DEBUG|WARN|WARNING|ERROR|FATAL|SUCCESS|OK)\]/i.test(line.trim())) return false;

  if (
    /^\s+at\s+/.test(line) ||
    /^\s+File\s+"/.test(line) ||
    /^\s*Caused by:/i.test(line) ||
    /^\s*\.\.\.\s+\d+\s+more/.test(line) ||
    /^\s+[|^~]+/.test(line)
  ) {
    return true;
  }

  // Attach indented lines directly to error/warning stack contexts
  if ((prevEntry.category === 'error' || prevEntry.category === 'warning') && /^\s{2,}\S/.test(line)) {
    return true;
  }

  return false;
}

export function parseLogContent(content: string, fileName: string, fileSize: number): ParsedLogResult {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  const entries: LogEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const lineNumber = i + 1;
    const prevEntry = entries.length > 0 ? entries[entries.length - 1] : null;

    if (isContinuationLine(line, prevEntry) && prevEntry) {
      prevEntry.rawText += `\n${line}`;
      prevEntry.endLineNumber = lineNumber;
      continue;
    }

    const { timestamp, body } = extractTimestampAndBody(line.trim());
    const { category, levelLabel } = classifyLine(line);

    entries.push({
      id: `${lineNumber}-${entries.length}`,
      lineNumber,
      endLineNumber: lineNumber,
      timestamp,
      levelLabel,
      message: body,
      rawText: line,
      category,
    });
  }

  // Generate diagnoses after multi-line stack traces are fully attached
  let success = 0;
  let error = 0;
  let warning = 0;
  let other = 0;

  for (const entry of entries) {
    if (entry.category === 'error') {
      error++;
      entry.diagnosis = buildDiagnosis(entry.rawText, 'error');
    } else if (entry.category === 'warning') {
      warning++;
      entry.diagnosis = buildDiagnosis(entry.rawText, 'warning');
    } else if (entry.category === 'success') {
      success++;
    } else {
      other++;
    }
  }

  return {
    fileName,
    fileSize,
    entries,
    stats: {
      total: entries.length,
      success,
      error,
      warning,
      other,
    },
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const SAMPLE_LOG_CONTENT = `2026-11-15T09:12:01.104Z [INFO] Bootstrapping application runtime environment
2026-11-15T09:12:01.482Z [INFO] Loaded configuration profile: production
2026-11-15T09:12:01.915Z [SUCCESS] Connected to Redis cache cluster at 10.0.4.12:6379
2026-11-15T09:12:02.310Z [WARN] Deprecated middleware signature detected in src/middleware/legacyAuth.ts:18 — update before v4.0
2026-11-15T09:12:02.845Z [SUCCESS] Server started and listening on port 3000
2026-11-15T09:12:14.209Z [INFO] GET /api/v1/orders 200 OK (38ms)
2026-11-15T09:13:05.771Z [WARN] Slow query detected (1482ms) in src/db/queries.ts:94 — consider adding index on orders(created_at)
2026-11-15T09:14:22.018Z [ERROR] Database connection refused: connect ECONNREFUSED 127.0.0.1:5432
    at Pool.connect (src/db/index.ts:42:13)
    at OrderService.fetchPending (src/services/orders.ts:118:24)
2026-11-15T09:14:49.512Z [WARN] Rate limit approaching threshold (429 Too Many Requests) for upstream billing gateway
2026-11-15T09:15:03.119Z [ERROR] TypeError: Cannot read properties of undefined (reading 'userId')
    at verifySession (src/services/auth.ts:67:19)
    at AuthController.handleCallback (src/routes/auth.ts:31:5)
2026-11-15T09:15:30.900Z [ERROR] ENOENT: no such file or directory, open './config/certificates/server.pem'
    at Object.readFileSync (server.ts:88:21)
2026-11-15T09:16:02.410Z [SUCCESS] Automated backup job completed successfully (142.6 MB archived)
2026-11-15T09:16:45.002Z [INFO] Health check probe passed for worker-node-02
2026-11-15T09:17:11.630Z [SUCCESS] Payment webhook verified and processed (201 Created)
2026-11-15T09:18:00.120Z [DEBUG] Scheduled garbage collection finished in 14ms`;

export function generateReportText(parsedLog: ParsedLogResult): string {
  const { fileName, stats, entries } = parsedLog;
  const lines: string[] = [];

  lines.push(`日誌診斷報告 — ${fileName}`);
  lines.push('='.repeat(60));
  lines.push(`總筆數：${stats.total}`);
  lines.push(`成功：${stats.success}  |  失敗：${stats.error}  |  警告：${stats.warning}  |  其他：${stats.other}`);
  lines.push('');

  const appendDiagnosticSection = (title: string, items: LogEntry[]) => {
    lines.push(`[${title}] (${items.length} 筆)`);
    lines.push('-'.repeat(60));
    if (items.length === 0) {
      lines.push('（無紀錄）');
      lines.push('');
      return;
    }
    items.forEach((entry, idx) => {
      const lineRange =
        entry.endLineNumber > entry.lineNumber
          ? `第 ${entry.lineNumber}-${entry.endLineNumber} 行`
          : `第 ${entry.lineNumber} 行`;
      lines.push(`${idx + 1}. ${entry.diagnosis?.summary || entry.message} (${lineRange})`);
      if (entry.timestamp) {
        lines.push(`   時間：${entry.timestamp}`);
      }
      if (entry.diagnosis) {
        lines.push('   推測可能原因：');
        entry.diagnosis.possibleCauses.forEach((cause) => {
          lines.push(`     - ${cause}`);
        });
        lines.push('   應該檢查的檔案：');
        entry.diagnosis.filesToCheck.forEach((file) => {
          lines.push(`     - ${file.path}（${file.reason}）`);
        });
      }
      lines.push('   原始日誌：');
      entry.rawText.split('\n').forEach((rawLine) => {
        lines.push(`     ${rawLine}`);
      });
      lines.push('');
    });
  };

  appendDiagnosticSection('失敗', entries.filter((e) => e.category === 'error'));
  appendDiagnosticSection('警告', entries.filter((e) => e.category === 'warning'));

  const appendSimpleSection = (title: string, items: LogEntry[]) => {
    lines.push(`[${title}] (${items.length} 筆)`);
    lines.push('-'.repeat(60));
    if (items.length === 0) {
      lines.push('（無紀錄）');
    } else {
      items.forEach((entry) => {
        lines.push(`- 第 ${entry.lineNumber} 行: ${entry.rawText}`);
      });
    }
    lines.push('');
  };

  appendSimpleSection('成功', entries.filter((e) => e.category === 'success'));
  appendSimpleSection('其他', entries.filter((e) => e.category === 'other'));

  return lines.join('\n');
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
