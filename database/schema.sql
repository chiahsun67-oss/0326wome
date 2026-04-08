-- ============================================================
-- WMSM 麥頭印標系統 - PostgreSQL Schema
-- ============================================================

-- 擴充套件
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Sequences（必須先建，才能在 DEFAULT 中使用） ────────────
CREATE SEQUENCE IF NOT EXISTS print_job_seq    START 1;
CREATE SEQUENCE IF NOT EXISTS import_batch_seq START 1;

-- ── 商品主檔 ──────────────────────────────────────────────
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  ref_code    VARCHAR(20)  DEFAULT '',
  unit        VARCHAR(10)  DEFAULT '個',
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE products IS '商品主檔';
COMMENT ON COLUMN products.code IS '品號（唯一）';
COMMENT ON COLUMN products.ref_code IS '對照號';

-- ── 供應商 ──────────────────────────────────────────────────
CREATE TABLE suppliers (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 採購單主檔 ──────────────────────────────────────────────
CREATE TABLE purchase_orders (
  id            SERIAL PRIMARY KEY,
  po_no         VARCHAR(30)  NOT NULL UNIQUE,
  po_date       DATE         NOT NULL,
  supplier_id   INTEGER      REFERENCES suppliers(id),
  supplier_name VARCHAR(100) NOT NULL DEFAULT '',
  remark        TEXT         DEFAULT '',
  status        VARCHAR(20)  NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','closed','cancelled')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN purchase_orders.po_no IS '採購單號，格式：PO-YYYYMMDD-NNN';

-- ── 採購單明細 ──────────────────────────────────────────────
CREATE TABLE po_items (
  id            SERIAL PRIMARY KEY,
  po_id         INTEGER      NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_no       SMALLINT     NOT NULL DEFAULT 1,
  product_id    INTEGER      REFERENCES products(id),
  product_code  VARCHAR(20)  NOT NULL,
  product_name  VARCHAR(100) NOT NULL DEFAULT '',
  ref_code      VARCHAR(20)  DEFAULT '',
  qty_per_box   INTEGER      NOT NULL DEFAULT 1 CHECK (qty_per_box > 0),
  total_qty     INTEGER      NOT NULL DEFAULT 0  CHECK (total_qty >= 0),
  total_boxes   INTEGER      GENERATED ALWAYS AS (CEIL(total_qty::NUMERIC / qty_per_box)) STORED,
  print_copies  INTEGER      NOT NULL DEFAULT 1  CHECK (print_copies > 0),
  mfg_date      DATE,
  exp_date      DATE,
  shelf_days    INTEGER      CHECK (shelf_days > 0),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN po_items.total_boxes IS '總箱數（自動計算：CEIL(total_qty / qty_per_box)）';
COMMENT ON COLUMN po_items.shelf_days IS '保存期限（天）';

-- ── 列印批次 ──────────────────────────────────────────────
CREATE TABLE print_jobs (
  id            SERIAL       PRIMARY KEY,
  job_no        VARCHAR(30)  NOT NULL UNIQUE,          -- 由 trigger 填入
  source_module VARCHAR(10)  NOT NULL CHECK (source_module IN ('WMSM020','WMSM030')),
  po_id         INTEGER      REFERENCES purchase_orders(id),
  import_batch  VARCHAR(30)  DEFAULT NULL,             -- 對應 WMSM030 的匯入批次號
  operator      VARCHAR(50)  NOT NULL DEFAULT '倉儲人員',
  printer_name  VARCHAR(100) DEFAULT 'Zebra ZT230 - 倉儲A線',
  total_copies  INTEGER      NOT NULL DEFAULT 0,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','printing','done','failed')),
  printed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- trigger：BEFORE INSERT 時產生 job_no（避免 DEFAULT 子句 parse-time 解析 regclass）
CREATE OR REPLACE FUNCTION fn_gen_job_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.job_no := 'PJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-'
             || LPAD(nextval('print_job_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_print_jobs_job_no
  BEFORE INSERT ON print_jobs
  FOR EACH ROW EXECUTE FUNCTION fn_gen_job_no();

-- ── 列印明細 ──────────────────────────────────────────────
CREATE TABLE print_job_items (
  id            SERIAL      PRIMARY KEY,
  job_id        INTEGER     NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
  line_no       SMALLINT    NOT NULL DEFAULT 1,
  product_code  VARCHAR(20) NOT NULL,
  product_name  VARCHAR(100) NOT NULL DEFAULT '',
  ref_code      VARCHAR(20)  DEFAULT '',
  qty_per_box   INTEGER     NOT NULL DEFAULT 1,
  total_qty     INTEGER     NOT NULL DEFAULT 0,
  total_boxes   INTEGER     NOT NULL DEFAULT 0,
  print_copies  INTEGER     NOT NULL DEFAULT 1,
  mfg_date      DATE,
  exp_date      DATE,
  shelf_days    INTEGER,
  label_data    JSONB       DEFAULT '{}'::JSONB,   -- 預留標籤樣板資料
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Excel 匯入批次 ──────────────────────────────────────────
CREATE TABLE import_batches (
  id            SERIAL      PRIMARY KEY,
  batch_no      VARCHAR(30) NOT NULL UNIQUE,            -- 由 trigger 填入
  file_name     VARCHAR(200) NOT NULL,
  operator      VARCHAR(50)  NOT NULL DEFAULT '倉儲人員',
  total_rows    INTEGER      NOT NULL DEFAULT 0,
  ok_rows       INTEGER      NOT NULL DEFAULT 0,
  warn_rows     INTEGER      NOT NULL DEFAULT 0,
  err_rows      INTEGER      NOT NULL DEFAULT 0,
  status        VARCHAR(20)  NOT NULL DEFAULT 'preview'
                             CHECK (status IN ('preview','executed','cancelled')),
  job_id        INTEGER      REFERENCES print_jobs(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- trigger：BEFORE INSERT 時產生 batch_no
CREATE OR REPLACE FUNCTION fn_gen_batch_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.batch_no := 'IMP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-'
               || LPAD(nextval('import_batch_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_import_batches_batch_no
  BEFORE INSERT ON import_batches
  FOR EACH ROW EXECUTE FUNCTION fn_gen_batch_no();

-- ── 匯入明細（含驗證結果） ──────────────────────────────────
CREATE TABLE import_batch_items (
  id            SERIAL      PRIMARY KEY,
  batch_id      INTEGER     NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_no        INTEGER     NOT NULL,
  product_code  VARCHAR(20),
  product_name  VARCHAR(100) DEFAULT '',
  ref_code      VARCHAR(20)  DEFAULT '',
  qty_per_box   INTEGER,
  total_qty     INTEGER,
  total_boxes   INTEGER,
  mfg_date      DATE,
  exp_date      DATE,
  shelf_days    INTEGER,
  print_copies  INTEGER,
  row_status    VARCHAR(10)  NOT NULL DEFAULT 'ok'
                             CHECK (row_status IN ('ok','warn','error')),
  messages      JSONB        NOT NULL DEFAULT '[]'::JSONB,  -- [{type,message}]
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 系統使用者 ──────────────────────────────────────────────
CREATE TABLE users (
  id            SERIAL       PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password      VARCHAR(100) NOT NULL,               -- ⚠ 正式環境請改用 bcrypt hash
  display_name  VARCHAR(50)  NOT NULL,
  department    VARCHAR(50)  NOT NULL DEFAULT '',
  role          VARCHAR(20)  NOT NULL DEFAULT 'operator'
                             CHECK (role IN ('admin','operator','inspector')),
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users                IS '系統使用者帳號';
COMMENT ON COLUMN users.username       IS '登入帳號（唯一）';
COMMENT ON COLUMN users.password       IS '密碼（明文僅供 Demo，正式環境請改 bcrypt）';
COMMENT ON COLUMN users.role           IS 'admin=管理員 / operator=倉儲人員 / inspector=品管人員';

-- ── UAT 確認簽核 ──────────────────────────────────────────
CREATE TABLE uat_confirmations (
  id              SERIAL      PRIMARY KEY,
  confirmer_name  VARCHAR(50) NOT NULL,
  department      VARCHAR(50) DEFAULT '',
  confirm_date    DATE        NOT NULL,
  result          VARCHAR(50) NOT NULL
                              CHECK (result IN ('pass','conditional_pass','fail')),
  check_items     JSONB       NOT NULL DEFAULT '{}'::JSONB,  -- {item_key: boolean}
  remarks         TEXT        DEFAULT '',
  version         VARCHAR(20) DEFAULT 'v1.0',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 索引 ──────────────────────────────────────────────────
CREATE INDEX idx_users_username       ON users(username);
CREATE INDEX idx_products_code        ON products(code);
CREATE INDEX idx_po_po_no             ON purchase_orders(po_no);
CREATE INDEX idx_po_items_po_id       ON po_items(po_id);
CREATE INDEX idx_print_jobs_created   ON print_jobs(created_at DESC);
CREATE INDEX idx_print_jobs_module    ON print_jobs(source_module);
CREATE INDEX idx_pji_job_id           ON print_job_items(job_id);
CREATE INDEX idx_pji_product_code     ON print_job_items(product_code);
CREATE INDEX idx_pji_printed_at       ON print_jobs(printed_at DESC);

-- ── 重複列印 View ──────────────────────────────────────────
CREATE OR REPLACE VIEW v_duplicate_prints AS
SELECT
  pji.product_code,
  pji.product_name,
  pj.po_id,
  COUNT(*) AS print_count,
  SUM(pji.print_copies) AS total_copies,
  MIN(pj.printed_at) AS first_print,
  MAX(pj.printed_at) AS last_print,
  ARRAY_AGG(pj.operator ORDER BY pj.printed_at) AS operators
FROM print_job_items pji
JOIN print_jobs pj ON pj.id = pji.job_id
WHERE pj.status = 'done'
GROUP BY pji.product_code, pji.product_name, pj.po_id
HAVING COUNT(*) > 1;

COMMENT ON VIEW v_duplicate_prints IS '重複列印偵測 View';

-- ── 列印歷史 View（含重複標示） ──────────────────────────
CREATE OR REPLACE VIEW v_print_history AS
SELECT
  pji.id,
  pj.printed_at,
  pji.product_code,
  pji.product_name,
  po.po_no         AS batch_no,
  pji.print_copies AS copies,
  pj.operator,
  pj.source_module AS module,
  pj.status,
  EXISTS (
    SELECT 1 FROM v_duplicate_prints dp
    WHERE dp.product_code = pji.product_code
      AND dp.po_id = pj.po_id
  ) AS is_duplicate
FROM print_job_items pji
JOIN print_jobs pj ON pj.id = pji.job_id
LEFT JOIN purchase_orders po ON po.id = pj.po_id
ORDER BY pj.printed_at DESC NULLS LAST;

-- ── 種子資料 ──────────────────────────────────────────────
-- 使用者（密碼：wmsm2026，以 bcrypt cost=10 hash）
INSERT INTO users (username, password, display_name, department, role) VALUES
  ('admin',       '$2b$10$XfF6ehhShrlPCibcRL/DTeADFq/I3BwSK2.oKb0MJGNxaCTw72vSy', '系統管理員', '資訊部', 'admin'),
  ('warehouse01', '$2b$10$E7vtoc/fxNzZRRv69Yis6OIPBZS3RGtk3fTSnSlQnhWrjy1nMrbiO', '倉儲人員甲', '倉儲部', 'operator'),
  ('warehouse02', '$2b$10$SVORciFP1nh3vx0o25zviuEr.8r5qrlyVsn4GvZJ/NQ.qCcpnXbHG', '倉儲人員乙', '倉儲部', 'operator'),
  ('qa01',        '$2b$10$WVZseaGSieZMuJEvKAe3CuNCvdG0VUgIa/07DWIA9z5vU57mcTHZm', '品管人員',   '品管部', 'inspector');

INSERT INTO suppliers (code, name) VALUES
  ('SUP001', '吉伊卡哇股份有限公司'),
  ('SUP002', 'Sanrio 台灣代理商'),
  ('SUP003', '角落小夥伴貿易有限公司');

INSERT INTO products (code, name, ref_code) VALUES
  ('50037631', '吉伊卡哇透明直傘',  '0741310'),
  ('A100001',  'Hello Kitty 保溫杯', ''),
  ('B200002',  'Sanrio 馬克杯組合',  ''),
  ('C300003',  '布丁狗玩偶',         ''),
  ('E400004',  '美樂蒂購物袋',       ''),
  ('F500005',  '角落小夥伴毛毯',     '1234567');

INSERT INTO purchase_orders (po_no, po_date, supplier_name, remark) VALUES
  ('PO-20250311-001', '2025-03-11', '吉伊卡哇股份有限公司', ''),
  ('PO-20250310-001', '2025-03-10', 'Sanrio 台灣代理商',    '春季進貨');

INSERT INTO po_items
  (po_id, line_no, product_code, product_name, ref_code, qty_per_box, total_qty, print_copies, mfg_date, exp_date, shelf_days)
VALUES
  (1, 1, '50037631', '吉伊卡哇透明直傘',  '0741310', 24, 480, 20, '2024-06-01', '2025-06-01', 365),
  (1, 2, 'A100001',  'Hello Kitty 保溫杯', '',        12, 120, 10, '2024-08-15', '2026-08-15', 731),
  (2, 1, 'B200002',  'Sanrio 馬克杯組合',  '',         6,  60, 10, '2024-09-01', '2026-09-01', 730);
