import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PrintHistoryItem, PrintStats } from '../../types';

export default function PrintHistory() {
  const [stats, setStats]     = useState<PrintStats | null>(null);
  const [items, setItems]     = useState<PrintHistoryItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [code, setCode]       = useState('');
  const [operator, setOperator] = useState('全部人員');
  const [operators, setOperators] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getPrintStats().then((r) => { if (r.success && r.data) setStats(r.data); });
    api.getOperators().then((r) => { if (r.success && r.data) setOperators(r.data); });
    doSearch();
  }, []);

  const doSearch = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      if (code)     params.product_code = code;
      if (operator !== '全部人員') params.operator = operator;
      const res = await api.getPrintHistory(params);
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="uat-notice">
        <div style={{ fontSize: '20px', flexShrink: 0 }}>📋</div>
        <div className="uat-notice-text">
          <strong>實務確認說明：</strong>此頁面可查詢所有列印紀錄。如果同一批次被重複列印，系統會標示「⚠ 重複」提醒主管注意。
        </div>
      </div>
      <div className="page-title">
        <h2>📊 列印歷史紀錄</h2>
        <p>查詢所有麥頭標籤列印記錄，支援日期、品號、人員多條件篩選。</p>
      </div>

      {/* 統計 */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{stats?.monthly_jobs ?? '—'}</div>
          <div className="stat-label">本月列印次數</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats?.monthly_copies?.toLocaleString() ?? '—'}</div>
          <div className="stat-label">本月列印張數</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--warn)' }}>{stats?.monthly_duplicates ?? '—'}</div>
          <div className="stat-label">本月重複列印次數</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats?.today_jobs ?? '—'}</div>
          <div className="stat-label">今日列印次數</div>
        </div>
      </div>

      {/* 篩選 */}
      <div className="card">
        <div className="card-header"><div className="card-title">🔍 篩選條件</div></div>
        <div className="card-body">
          <div className="form-row">
            <div className="field">
              <div className="field-label">列印日期（起）</div>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="field">
              <div className="field-label">列印日期（迄）</div>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="field">
              <div className="field-label">品號</div>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="輸入品號關鍵字" />
            </div>
            <div className="field">
              <div className="field-label">操作人員</div>
              <select value={operator} onChange={(e) => setOperator(e.target.value)}>
                <option>全部人員</option>
                {operators.map((op) => <option key={op}>{op}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={doSearch} disabled={loading}>🔍 查詢</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              setDateFrom(''); setDateTo(''); setCode(''); setOperator('全部人員');
            }}>清除條件</button>
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">列印紀錄清單</div>
          <span className="badge badge-ok">共 {total} 筆</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="hist-tbl">
            <thead>
              <tr>
                <th>列印時間</th><th>品號</th><th>品名</th><th>批次號</th>
                <th>張數</th><th>操作人員</th><th>模組</th><th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: 'var(--soft)' }}>查詢中...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: 'var(--soft)' }}>無資料</td></tr>
              )}
              {!loading && items.map((item) => (
                <tr key={item.id} className={item.is_duplicate ? 'dup' : ''}>
                  <td>{item.printed_at ?? '—'}</td>
                  <td className="mono">{item.product_code}</td>
                  <td>{item.product_name}</td>
                  <td className="mono">{item.batch_no ?? '—'}</td>
                  <td>{item.copies}</td>
                  <td>{item.operator}</td>
                  <td>
                    <span className={`badge ${item.module === 'WMSM020' ? 'badge-new' : ''}`}
                      style={item.module === 'WMSM030' ? { background: 'var(--sky)', color: 'var(--blue)', border: '1px solid #b8d4e8', fontSize: '11px' } : undefined}>
                      {item.module}
                    </span>
                  </td>
                  <td>
                    {item.is_duplicate
                      ? <span className="badge badge-warn">⚠ 重複列印</span>
                      : <span className="badge badge-ok">✓ 成功</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
