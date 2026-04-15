-- Migration 002: 商品主檔新增保存期限欄位
-- 執行：psql -U postgres -d wmsm -f database/migrations/002_add_product_shelf_days.sql

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shelf_days INTEGER CHECK (shelf_days > 0);

COMMENT ON COLUMN products.shelf_days IS '預設保存期限（天），帶入套印作業時自動填充';

-- 種子資料更新（有明確保存期限的商品）
UPDATE products SET shelf_days = 365 WHERE code = '50037631';
UPDATE products SET shelf_days = 731 WHERE code = 'A100001';
UPDATE products SET shelf_days = 730 WHERE code = 'B200002';
