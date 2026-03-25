import { useState } from 'react';
import { api } from '../../api/client';

interface Props { onToast: (msg: string) => void }

const CHECK_ITEMS: { key: string; section: string; title: string; desc: string }[] = [
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

export default function UATConfirm({ onToast }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [confirmer, setConfirmer] = useState('');
  const [dept, setDept]       = useState('');
  const [confirmDate, setConfirmDate] = useState(new Date().toISOString().slice(0,10));
  const [result, setResult]   = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = (key: string) => setChecked((c) => ({ ...c, [key]: !c[key] }));
  const doneCount = Object.values(checked).filter(Boolean).length;

  const handleSubmit = async () => {
    if (!confirmer || !confirmDate || !result) {
      onToast('✗ 確認人員、日期、結果為必填');
      return;
    }
    setLoading(true);
    try {
      const res = await api.saveUATConfirmation({
        confirmer_name: confirmer,
        department: dept,
        confirm_date: confirmDate,
        result,
        check_items: checked,
        remarks,
      });
      if (res.success) {
        onToast('✅ UAT 簽核已儲存');
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
        <p>請逐項確認各功能畫面，勾選後填寫意見，由主管簽核。</p>
      </div>

      {/* 確認項目 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 確認項目</div>
          <span className={`badge ${doneCount === CHECK_ITEMS.length ? 'badge-ok' : doneCount > 0 ? 'badge-warn' : 'badge-pending'}`}>
            {doneCount} / {CHECK_ITEMS.length} 已確認
          </span>
        </div>
        <div className="card-body">
          <div style={{ fontSize: '12.5px', color: 'var(--mid)', marginBottom: '14px' }}>
            請點擊各項目打勾確認，若有問題請在下方備注欄說明。
          </div>
          {sections.map((sec) => (
            <div key={sec}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--g1)', margin: '4px 0 6px', letterSpacing: '.05em' }}>
                {sec.toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {CHECK_ITEMS.filter((i) => i.section === sec).map((item) => (
                  <div
                    key={item.key}
                    className={`confirm-item ${checked[item.key] ? 'checked' : ''}`}
                    onClick={() => toggle(item.key)}
                  >
                    <div className="confirm-cb">{checked[item.key] ? '✓' : ''}</div>
                    <div style={{ flex: 1 }}>
                      <div className="confirm-title">{item.title}</div>
                      <div className="confirm-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 備注 */}
      <div className="card">
        <div className="card-header"><div className="card-title">📝 修改意見與備注</div></div>
        <div className="card-body">
          <textarea
            style={{ width: '100%', height: '120px', resize: 'vertical' }}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="請填寫需要調整的項目，例如：&#10;• 欄位名稱調整（如：「保存期限」改為「保固天數」）&#10;• 標籤上希望增加欄位 XXX"
          />
        </div>
      </div>

      {/* 主管簽核 */}
      <div className="card">
        <div className="card-header"><div className="card-title">🖊 主管簽核</div></div>
        <div className="card-body">
          <div className="form-row-3">
            <div className="field">
              <div className="field-label">確認人員 <span className="req">*</span></div>
              <input type="text" value={confirmer} onChange={(e) => setConfirmer(e.target.value)} placeholder="姓名" />
            </div>
            <div className="field">
              <div className="field-label">部門 / 職稱</div>
              <input type="text" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="例：倉儲部 / 組長" />
            </div>
            <div className="field">
              <div className="field-label">確認日期 <span className="req">*</span></div>
              <input type="date" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} />
            </div>
          </div>
          <div className="form-row-2">
            <div className="field">
              <div className="field-label">確認結果 <span className="req">*</span></div>
              <select value={result} onChange={(e) => setResult(e.target.value)}>
                <option value="">── 請選擇 ──</option>
                <option value="pass">✅ 確認通過，可進行下一步開發</option>
                <option value="conditional_pass">⚠ 有條件通過，依備注修改後不需再確認</option>
                <option value="fail">❌ 需修改後重新確認</option>
              </select>
            </div>
          </div>
          <div className="btn-bar">
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              💾 儲存簽核
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
