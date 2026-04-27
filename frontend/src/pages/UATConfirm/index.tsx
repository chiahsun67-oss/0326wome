import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { UATHistoryItem, UserInfo } from '../../types';

interface Props {
  onToast: (msg: string) => void;
  user: UserInfo;
}

interface CheckItem { key: string; section: string; title: string; desc: string }
interface ItemNote  { error_type: string; suggestion: string }

const CHECK_ITEMS: CheckItem[] = [
  { key: 'po_find',   section: 'WMSM020 套印作業', title: '採購單查詢（FIND）功能欄位符合需求', desc: '採購單號格式、供應商自動帶入、進貨日期等基本資訊是否正確' },
  { key: 'auto_name', section: 'WMSM020 套印作業', title: '品號自動帶入品名功能符合需求', desc: '輸入品號後，品名是否能正確自動帶入' },
  { key: 'expiry',    section: 'WMSM020 套印作業', title: '效期三則二計算規則符合實際作業', desc: '製造日期/有效日期/保存期限三填二的自動計算邏輯是否與日常作業一致' },
  { key: 'item_cols', section: 'WMSM020 套印作業', title: '品項明細表欄位完整（單箱數、總進貨、總箱數、列印張數）', desc: '表格欄位是否涵蓋進貨作業所需的所有資訊' },
  { key: 'print_dlg', section: 'WMSM020 套印作業', title: '列印前確認視窗內容清楚（含張數、條碼機名稱）', desc: '執行列印前的確認框是否提供足夠資訊讓人員核對' },
  { key: 'excel_tpl', section: 'WMSM030 Excel 匯入', title: 'Excel 範本欄位符合實際填寫習慣', desc: '欄位順序是否與倉儲人員習慣的填寫順序一致' },
  { key: 'err_msg',  section: 'WMSM030 Excel 匯入', title: '匯入驗證的錯誤提示訊息清楚易懂', desc: '錯誤說明是否讓非技術人員也能看懂' },
  { key: 'err_stop', section: 'WMSM030 Excel 匯入', title: '有錯誤時停止列印的機制符合實際需求', desc: '只有警告時可繼續列印、有錯誤時必須修正的機制是否符合作業規範' },
  { key: 'label',    section: '標籤與紀錄', title: '標籤欄位內容符合實際貼標需求', desc: '標籤上的品號、品名、效期、條碼、數量等資訊是否完整且位置合適' },
  { key: 'history',  section: '標籤與紀錄', title: '列印歷史紀錄的查詢欄位及重複列印標示符合稽核需求', desc: '紀錄中的時間、人員、品號、張數及重複列印標示是否滿足管理追蹤需求' },
];

const ERROR_TYPES = [
  { value: '',         label: '── 無問題 ──' },
  { value: 'display',  label: '顯示錯誤' },
  { value: 'field',    label: '欄位不符' },
  { value: 'function', label: '功能異常' },
  { value: 'flow',     label: '流程錯誤' },
  { value: 'other',    label: '其他' },
];

const RESULT_LABEL: Record<string, string> = {
  pass: '✅ 確認通過',
  conditional_pass: '⚠ 有條件通過',
  fail: '❌ 需修改後重確認',
};

const RESULT_COLOR: Record<string, string> = {
  pass: 'var(--ok)',
  conditional_pass: '#d97706',
  fail: 'var(--danger, #dc2626)',
};

const canConfirm = (role: UserInfo['role']) => role === 'admin' || role === 'inspector';

export default function UATConfirm({ onToast, user }: Props) {
  const [status,   setStatus]   = useState<Record<string, 'pass' | 'fail'>>({});
  const [notes,    setNotes]    = useState<Record<string, ItemNote>>({});
  const [confirmer, setConfirmer] = useState(user.display_name);
  const [dept, setDept]           = useState(user.department);
  const [confirmDate, setConfirmDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult]       = useState('');
  const [remarks, setRemarks]     = useState('');
  const [loading, setLoading]     = useState(false);

  const [history, setHistory]         = useState<UATHistoryItem[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histExpanded, setHistExpanded] = useState(false);

  const allowed   = canConfirm(user.role);
  const doneCount = Object.keys(status).filter((k) => status[k] !== undefined).length;
  const percent   = Math.round((doneCount / CHECK_ITEMS.length) * 100);

  const setItemStatus = (key: string, val: 'pass' | 'fail') => {
    if (!allowed) return;
    setStatus((s) => ({ ...s, [key]: val }));
    // 切回正常時清空錯誤資料
    if (val === 'pass') {
      setNotes((n) => ({ ...n, [key]: { error_type: '', suggestion: '' } }));
    }
  };

  const setNote = (key: string, field: keyof ItemNote, value: string) =>
    setNotes((n) => {
      const prev = n[key] ?? { error_type: '', suggestion: '' };
      return { ...n, [key]: { ...prev, [field]: value } };
    });

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const res = await api.getUATHistory();
      if (res.success && res.data) setHistory(res.data);
    } finally {
      setHistLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSubmit = async () => {
    if (!allowed) { onToast('✗ 您無簽核權限'); return; }
    if (!confirmer || !confirmDate || !result) {
      onToast('✗ 確認人員、日期、結果為必填');
      return;
    }
    const checkItemsPayload = CHECK_ITEMS.reduce<Record<string, { checked: boolean; error_type: string; suggestion: string }>>((acc, item) => {
      const s = status[item.key];
      acc[item.key] = {
        checked:    s === 'pass',
        error_type: s === 'fail' ? (notes[item.key]?.error_type ?? '') : '',
        suggestion: s === 'fail' ? (notes[item.key]?.suggestion ?? '') : '',
      };
      return acc;
    }, {});

    setLoading(true);
    try {
      const res = await api.saveUATConfirmation({
        confirmer_name: confirmer,
        department:     dept,
        confirm_date:   confirmDate,
        result,
        check_items:    checkItemsPayload,
        remarks,
      });
      if (res.success) {
        onToast('✅ UAT 簽核已儲存');
        await loadHistory();
      } else {
        onToast(`✗ ${res.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const sections = [...new Set(CHECK_ITEMS.map((i) => i.section))];

  return (
    <div>
      <div className="page-title">
        <h2>✅ 實務單位確認簽核</h2>
        <p>請逐項確認各功能畫面，勾選通過、填寫錯誤類型與修改建議，最後由主管簽核。</p>
      </div>

      {/* 權限提示 */}
      {!allowed && (
        <div style={{
          background: '#fef9c3', border: '1px solid #fbbf24', borderRadius: '8px',
          padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e',
        }}>
          ⚠ 您的帳號（{user.role}）僅供查閱，無法提交簽核。請聯絡管理員或品管人員操作。
        </div>
      )}

      {/* 確認項目（含錯誤選擇與建議） */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 確認項目</div>
          <span className={`badge ${doneCount === CHECK_ITEMS.length ? 'badge-ok' : doneCount > 0 ? 'badge-warn' : 'badge-pending'}`}>
            {doneCount} / {CHECK_ITEMS.length} 已確認 · {percent}%
          </span>
        </div>

        {/* 進度條 */}
        <div style={{ position: 'relative', height: '20px', background: '#dc2626', overflow: 'hidden', margin: '10px 0' }}>
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7)',
              backgroundSize: '200% 100%',
              animation: doneCount > 0 ? 'uat-bar-shine 1.8s linear infinite' : 'none',
              transition: 'width 0.35s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              lineHeight: 1,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '.04em',
              textShadow: '0 1px 3px rgba(0,0,0,.55)',
              pointerEvents: 'none',
            }}
          >
            {percent}%
          </div>
        </div>
        <style>{`
          @keyframes uat-bar-shine {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        <div className="card-body">
          <div style={{ fontSize: '12.5px', color: 'var(--mid)', marginBottom: '14px' }}>
            點 <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ 正常</span> 或 <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ 錯誤</span> 逐項確認；標記錯誤時請填寫修改建議。
          </div>

          {sections.map((sec) => (
            <div key={sec}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--g1)', margin: '4px 0 6px', letterSpacing: '.05em' }}>
                {sec.toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                {CHECK_ITEMS.filter((i) => i.section === sec).map((item) => {
                  const note    = notes[item.key] ?? { error_type: '', suggestion: '' };
                  const itemSt  = status[item.key];
                  const isFail  = itemSt === 'fail';
                  const isPass  = itemSt === 'pass';
                  return (
                    <div
                      key={item.key}
                      style={{
                        border: `1.5px solid ${isFail ? '#fca5a5' : isPass ? '#86efac' : 'var(--g2)'}`,
                        borderRadius: '8px',
                        background: isFail ? '#fff5f5' : isPass ? '#f0fdf4' : '#fff',
                        transition: 'border-color 0.2s, background 0.2s',
                        overflow: 'hidden',
                      }}
                    >
                      {/* 上半：標題 + 描述 + 按鈕 */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 14px' }}>
                        <div style={{ flex: 1 }}>
                          <div className="confirm-title">{item.title}</div>
                          <div className="confirm-desc">{item.desc}</div>
                        </div>
                        {/* 綠勾 / 紅叉 按鈕 */}
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginTop: '2px' }}>
                          <button
                            onClick={() => setItemStatus(item.key, 'pass')}
                            disabled={!allowed}
                            title="正常"
                            style={{
                              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                              cursor: allowed ? 'pointer' : 'default',
                              fontSize: '18px', lineHeight: 1,
                              background: isPass ? '#16a34a' : '#f0fdf4',
                              color: isPass ? '#fff' : '#86efac',
                              boxShadow: isPass ? '0 2px 6px rgba(22,163,74,.35)' : 'none',
                              transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                            }}
                          >✓</button>
                          <button
                            onClick={() => setItemStatus(item.key, 'fail')}
                            disabled={!allowed}
                            title="錯誤"
                            style={{
                              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                              cursor: allowed ? 'pointer' : 'default',
                              fontSize: '18px', lineHeight: 1,
                              background: isFail ? '#dc2626' : '#fff5f5',
                              color: isFail ? '#fff' : '#fca5a5',
                              boxShadow: isFail ? '0 2px 6px rgba(220,38,38,.35)' : 'none',
                              transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                            }}
                          >✗</button>
                        </div>
                      </div>

                      {/* 下半：修改建議（僅錯誤時展開） */}
                      {isFail && (
                        <div style={{
                          display: 'flex', gap: '8px',
                          padding: '10px 14px', paddingTop: '8px',
                          borderTop: '1px solid #fca5a5',
                          background: '#fff1f2',
                          opacity: allowed ? 1 : 0.55,
                        }}>
                          <div style={{ flex: '0 0 140px' }}>
                            <div style={{ fontSize: '11px', color: '#b91c1c', marginBottom: '4px', fontWeight: 600 }}>錯誤類型</div>
                            <select
                              value={note.error_type}
                              onChange={(e) => setNote(item.key, 'error_type', e.target.value)}
                              disabled={!allowed}
                              style={{ width: '100%', fontSize: '12.5px', padding: '4px 6px', border: '1px solid #fca5a5', borderRadius: '4px', background: '#fff' }}
                            >
                              {ERROR_TYPES.filter((o) => o.value !== '').map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', color: '#b91c1c', marginBottom: '4px', fontWeight: 600 }}>修改建議</div>
                            <input
                              type="text"
                              value={note.suggestion}
                              onChange={(e) => setNote(item.key, 'suggestion', e.target.value)}
                              disabled={!allowed}
                              placeholder="請描述問題或修改方向"
                              style={{ width: '100%', fontSize: '12.5px', padding: '4px 8px', border: '1px solid #fca5a5', borderRadius: '4px', boxSizing: 'border-box', background: '#fff' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 主管簽核 */}
      <div className="card">
        <div className="card-header"><div className="card-title">🖊 主管簽核</div></div>
        <div className="card-body">
          <div className="form-row-3">
            <div className="field">
              <div className="field-label">確認人員 <span className="req">*</span></div>
              <input type="text" value={confirmer} onChange={(e) => setConfirmer(e.target.value)} placeholder="姓名" disabled={!allowed} />
            </div>
            <div className="field">
              <div className="field-label">部門 / 職稱</div>
              <input type="text" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="例：倉儲部 / 組長" disabled={!allowed} />
            </div>
            <div className="field">
              <div className="field-label">確認日期 <span className="req">*</span></div>
              <input type="date" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} disabled={!allowed} />
            </div>
          </div>
          <div className="form-row-2">
            <div className="field">
              <div className="field-label">確認結果 <span className="req">*</span></div>
              <select value={result} onChange={(e) => setResult(e.target.value)} disabled={!allowed}>
                <option value="">── 請選擇 ──</option>
                <option value="pass">✅ 確認通過，可進行下一步開發</option>
                <option value="conditional_pass">⚠ 有條件通過，依建議修改後不需再確認</option>
                <option value="fail">❌ 需修改後重新確認</option>
              </select>
            </div>
            <div className="field">
              <div className="field-label">整體備注</div>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={!allowed}
                placeholder="整體說明（選填）"
              />
            </div>
          </div>
          <div className="btn-bar">
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !allowed}>
              💾 儲存簽核
            </button>
          </div>
        </div>
      </div>

      {/* 簽核歷程 */}
      <div className="card">
        <div
          className="card-header"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setHistExpanded((v) => !v)}
        >
          <div className="card-title">🗂 簽核歷程查詢</div>
          <span style={{ fontSize: '13px', color: 'var(--mid)' }}>
            {histLoading ? '載入中…' : `共 ${history.length} 筆`} {histExpanded ? '▲' : '▼'}
          </span>
        </div>

        {histExpanded && (
          <div className="card-body" style={{ padding: 0 }}>
            {history.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--mid)', fontSize: '13px' }}>
                尚無簽核記錄
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--g2)' }}>
                    {['#', '日期', '確認人員', '部門', '結果', '整體備注', '建立時間'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--mid)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, idx) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--g2)', background: idx % 2 === 0 ? '#fff' : 'var(--bg)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--mid)' }}>{row.id}</td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{row.confirm_date}</td>
                      <td style={{ padding: '8px 12px' }}>{row.confirmer_name}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--mid)' }}>{row.department || '—'}</td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontWeight: 600, color: RESULT_COLOR[row.result] ?? 'inherit' }}>
                        {RESULT_LABEL[row.result] ?? row.result}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--mid)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.remarks || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--mid)', whiteSpace: 'nowrap' }}>
                        {new Date(row.created_at).toLocaleString('zh-TW', { hour12: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
