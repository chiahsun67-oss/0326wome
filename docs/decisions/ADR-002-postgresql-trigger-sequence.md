# ADR-002：使用 BEFORE INSERT Trigger 產生流水號

**日期：** 2026-03-25
**狀態：** 已採納

## 背景
`print_jobs.job_no` 與 `import_batches.batch_no` 需要格式化流水號（如 `PJ-20260325-001`）。
最初嘗試在 `DEFAULT` 子句使用 `nextval('print_job_seq')`，但執行 `psql -f schema.sql` 時報錯：

```
ERROR: relation "print_job_seq" does not exist
LINE 73: ... nextval('print_job_seq')::TEXT ...
```

## 根因
PostgreSQL 在執行 `CREATE TABLE` 時，會在 **parse time** 將 DEFAULT 子句中的字串常數強制轉型為 `regclass`，並立即查找 pg_class catalog。即使 sequence 定義在同一個 SQL 檔案的前幾行，若 parser 已經解析到 DEFAULT 子句時 sequence 尚未建立（或因 transaction 時序問題），就會直接報錯。

## 決策
改用 **BEFORE INSERT Trigger**：

```sql
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
```

PL/pgSQL 函式體在 **execution time** 才解析 `nextval('print_job_seq')`，此時 sequence 已存在，不會報錯。

## 後果
**正面：**
- 完全解決 parse-time regclass 解析問題
- 邏輯集中在 trigger，應用層無需傳入 job_no
- 可透過 `RETURNING job_no` 取回 trigger 產生的值

**負面：**
- 需要額外維護 trigger function
- 單元測試需考慮 trigger 是否觸發
