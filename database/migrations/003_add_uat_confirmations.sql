-- Migration 003: 新增 UAT 使用者驗收測試簽核表
-- 執行：psql -U postgres -d wmsm -f database/migrations/003_add_uat_confirmations.sql

CREATE TABLE IF NOT EXISTS uat_confirmations (
  id              SERIAL      PRIMARY KEY,
  confirmer_name  VARCHAR(50) NOT NULL,
  department      VARCHAR(50) DEFAULT '',
  confirm_date    DATE        NOT NULL,
  result          VARCHAR(50) NOT NULL
                              CHECK (result IN ('pass','conditional_pass','fail')),
  check_items     JSONB       NOT NULL DEFAULT '{}'::JSONB,
  remarks         TEXT        DEFAULT '',
  version         VARCHAR(20) DEFAULT 'v1.0',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  uat_confirmations              IS 'UAT 使用者驗收測試簽核紀錄';
COMMENT ON COLUMN uat_confirmations.check_items  IS '逐項確認結果：{item_key: {checked, error_type, suggestion}}';
COMMENT ON COLUMN uat_confirmations.result       IS 'pass=確認通過 / conditional_pass=有條件通過 / fail=需修改後重確認';
