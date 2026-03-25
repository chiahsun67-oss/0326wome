# ADR-003：pg Pool 連線必須置於 try 區塊內

**日期：** 2026-03-25
**狀態：** 已採納

## 背景
後端 API 持續回傳 500 空 body，前端出現：
```
SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

## 根因
所有需要 transaction 的 controller 原寫法：
```typescript
const client = await pool.connect();  // ← try 區塊外
try {
  await client.query('BEGIN');
  ...
} catch (err) {
  res.status(500).json({ error: String(err) });
} finally {
  client.release();
}
```

若 `pool.connect()` 本身拋出例外（連線失敗、timeout），Express 4 不會自動捕捉 async 錯誤，
導致 unhandled rejection → Node.js 送出空 body 的 500，前端 `res.json()` 解析失敗。

## 決策

**後端：** `pool.connect()` 移入 try，改用 `let client` + `client?.release()`

```typescript
let client;
try {
  client = await pool.connect();
  ...
} catch (err) {
  await client?.query('ROLLBACK');
  res.status(500).json({ success: false, error: String(err) });
} finally {
  client?.release();
}
```

**後端：** 加上全域 Express error middleware（4 個參數）

```typescript
app.use((err: Error, _req, res, _next) => {
  res.status(500).json({ success: false, error: err.message });
});
```

**前端：** `client.ts` 改用 `res.text()` + try JSON.parse，防止空 body 爆錯

```typescript
async function parseJSON<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  if (!text) return { success: false, error: `HTTP ${res.status} - 空回應` };
  try { return JSON.parse(text); }
  catch { return { success: false, error: `HTTP ${res.status} - 非 JSON` }; }
}
```

## 後果
- 所有 API 錯誤都回傳結構化 JSON，前端可正確顯示錯誤訊息
- 連線洩漏風險消除（`client?.release()` 確保釋放）
