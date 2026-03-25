# API 模組上下文

## 職責
處理所有對外介面：HTTP 路由定義、請求驗證、回應格式化。

## 路由清單（backend/src/routes/index.ts）

| Method | 路徑 | Controller | 說明 |
|--------|------|-----------|------|
| GET | `/api/products/search?q=` | products.searchProducts | 模糊搜尋商品 |
| GET | `/api/products/:code` | products.getProductByCode | 依品號查詢 |
| GET | `/api/purchase-orders/:poNo` | purchaseOrders.getPurchaseOrder | 採購單含明細 |
| POST | `/api/print-jobs` | printJobs.createPrintJob | 建立列印作業 |
| GET | `/api/print-history` | printJobs.getPrintHistory | 歷史查詢（篩選+分頁） |
| GET | `/api/print-stats` | printJobs.getPrintStats | 統計摘要 |
| GET | `/api/operators` | printJobs.getOperators | 操作人員清單 |
| POST | `/api/import/preview` | imports.previewImport | Excel 驗證（multer） |
| POST | `/api/import/execute` | imports.executeImport | 執行批次列印 |
| POST | `/api/uat/confirm` | uat.saveUATConfirmation | UAT 簽核儲存 |

## 統一回應格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

## 規範
- 輸入驗證在此層完成，不往下傳遞非法資料
- 錯誤一律回傳 `{ success: false, error: "說明" }`，HTTP status 對應 4xx/5xx
- 不包含業務邏輯，只做路由分發與參數整理
- 所有使用者輸入視為不可信（SQL 全部參數化）
