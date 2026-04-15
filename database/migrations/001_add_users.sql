-- ============================================================
-- Migration 001 — 新增使用者帳號資料表
-- 適用於：已執行 schema.sql 的既有資料庫
-- 執行：psql wmsm -f database/migrations/001_add_users.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL       PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password      VARCHAR(100) NOT NULL,
  display_name  VARCHAR(50)  NOT NULL,
  department    VARCHAR(50)  NOT NULL DEFAULT '',
  role          VARCHAR(20)  NOT NULL DEFAULT 'operator'
                             CHECK (role IN ('admin','operator','inspector')),
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 種子帳號（若已存在則略過）
INSERT INTO users (username, password, display_name, department, role)
VALUES
  ('admin',       'wmsm2026', '系統管理員', '資訊部', 'admin'),
  ('warehouse01', 'wmsm2026', '倉儲人員甲', '倉儲部', 'operator'),
  ('warehouse02', 'wmsm2026', '倉儲人員乙', '倉儲部', 'operator'),
  ('qa01',        'wmsm2026', '品管人員',   '品管部', 'inspector')
ON CONFLICT (username) DO NOTHING;
