import { useState, useCallback } from 'react';
import { api } from '../../api/client';
import { POItem } from '../../types';

interface Props { onToast: (msg: string) => void; onSwitchHistory: () => void }

const EMPTY_ITEM = (): POItem => ({
  product_code: '', product_name: '', ref_code: '',
  qty_per_box: '', total_qty: '', total_boxes: '',
  print_copies: 1, mfg_date: '', exp_date: '', shelf_days: '',
});

export default function WMSM020({ onToast, onSwitchHistory }: Props) {
  const [poNo, setPoNo]         = useState('PO-20250311-001');
  const [poDate, setPoDate]     = useState('2025-03-11');
  const [supplier, setSupplier] = useState('');
  const [remark, setRemark]     = useState('');
  const [mfgDate, setMfgDate]   = useState('2024-06-01');
  const [expDate, setExpDate]   = useState('');
  const [shelfDays, setShelfDays] = useState<number | ''>('365');
  const [items, setItems]       = useState<POItem[]>([EMPTY_ITEM(), EMPTY_ITEM()]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]   = useState(false);

  // 效期三選二計算
  const handleExpiryChange = useCallback((field: 'mfg' | 'exp' | 'shelf', value: string) => {
    const toMs = (d: string) => d ? new Date(d).getTime() : NaN;
    const addDays = (d: string, days: number) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() + days);
      return dt.toISOString().slice(0, 10);
    };
    const diffDays = (a: string, b: string) => {
      const diff = toMs(b) - toMs(a);
      return isNaN(diff) ? '' : Math.round(diff / 86400000);
    };

    if (field === 'mfg') {
      setMfgDate(value);
      if (shelfDays) setExpDate(addDays(value, Number(shelfDays)));
      else if (expDate) setShelfDays(diffDays(value, expDate) as number | '');
    } else if (field === 'exp') {
      setExpDate(value);
      if (mfgDate) setShelfDays(diffDays(mfgDate, value) as number | '');
      else if (shelfDays) setMfgDate(addDays(value, -Number(shelfDays)));
    } else {
      setShelfDays(value === '' ? '' : Number(value));
      if (mfgDate && value) setExpDate(addDays(mfgDate, Number(value)));
      else if (expDate && value) setMfgDate(addDays(expDate, -Number(value)));
    }
  }, [mfgDate, expDate, shelfDays]);

  const doFind = async () => {
    if (!poNo.trim()) return;
    setLoading(true);
    try {
      const res = await api.getPurchaseOrder(poNo.trim());
      if (res.success && res.data) {
        setPoDate(res.data.po_date);
        setSupplier(res.data.supplier_name);
        setRemark(res.data.remark);
        setItems(res.data.items.map((i) => ({
          ...i,
          qty_per_box: i.qty_per_box,
          total_qty: i.total_qty,
          total_boxes: i.total_boxes,
          print_copies: i.print_copies,
          mfg_date: i.mfg_date ?? '',
          exp_date: i.exp_date ?? '',
          shelf_days: i.shelf_days ?? '',
        })));
        onToast(`✓ 採購單 ${poNo} 帶入 ${res.data.items.length} 筆商品`);
      } else {
        onToast(`✗ ${res.error ?? '查無採購單'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const autoFillName = async (idx: number, code: string) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], product_code: code };
    setItems(newItems);
    if (!code.trim()) return;
    const res = await api.getProduct(code.trim());
    if (res.success && res.data) {
      newItems[idx] = { ...newItems[idx], product_name: res.data.name, ref_code: res.data.ref_code };
      setItems([...newItems]);
    }
  };

  const updateItem = (idx: number, field: keyof POItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[idx], [field]: value };
    // 自動計算 total_boxes
    const box = Number(field === 'qty_per_box' ? value : item.qty_per_box);
    const total = Number(field === 'total_qty' ? value : item.total_qty);
    if (box > 0 && total > 0) item.total_boxes = Math.ceil(total / box);
    newItems[idx] = item;
    setItems(newItems);
  };

  const totalCopies = items.reduce((s, i) => s + Number(i.print_copies || 0), 0);

  const doPrint = async () => {
    setLoading(true);
    try {
      const res = await api.createPrintJob({
        source_module: 'WMSM020',
        po_no: poNo.trim() || undefined,
        operator: '倉儲人員',
        items: items.filter((i) => i.product_code).map((i) => ({
          product_code: i.product_code,
          product_name: i.product_name,
          ref_code: i.ref_code,
          qty_per_box: Number(i.qty_per_box) || 1,
          total_qty: Number(i.total_qty) || 0,
          total_boxes: Number(i.total_boxes) || 0,
          print_copies: Number(i.print_copies) || 1,
          mfg_date: mfgDate || null,
          exp_date: expDate || null,
          shelf_days: shelfDays !== '' ? Number(shelfDays) : null,
        })),
      });
      setShowModal(false);
      if (res.success) {
        onToast(res.message ?? `🖨 列印指令已送出，共 ${res.data?.total_copies} 張`);
        onSwitchHistory();
      } else {
        onToast(`✗ ${res.error}`);
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
          <strong>實務確認說明：</strong>此畫面為 WMSM020 套印作業。請依照實際作業流程逐步操作，確認每個欄位名稱、必填規則、及自動計算是否符合需求。
        </div>
      </div>

      <div className="page-title">
        <h2><span className="module-tag">WMSM020</span> 進貨麥頭標籤套印作業</h2>
        <p>適用情境：進貨時手動輸入商品資料，或透過採購單號批次帶入，產生並列印麥頭標籤。</p>
      </div>

      {/* 步驟 */}
      <div className="step-guide">
        {['輸入採購單號','填寫商品資料','填寫效期','確認張數列印'].map((s,i) => (
          <div key={i} className={`sg-step ${i === 0 ? 'done' : i === 1 ? 'current' : ''}`}>
            <div className="sg-num">步驟 {i+1}</div>
            <div className="sg-title">{s}</div>
          </div>
        ))}
      </div>

      <div className="tip">
        <div className="tip-icon">💡</div>
        <div className="tip-text">
          <strong>有採購單號時：</strong>直接輸入採購單號並按「查詢」，系統會自動帶入商品清單。<br />
          <strong>無採購單號時：</strong>按「新增列」手動逐筆輸入。
        </div>
      </div>

      {/* 採購單查詢 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔍 採購單查詢（選填）</div>
          <span className="badge badge-new">可略過，直接手動填寫</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="field">
              <div className="field-label">採購單號</div>
              <div className="input-group">
                <input type="text" value={poNo} onChange={(e) => setPoNo(e.target.value)} className="demo" />
                <button className="find-btn" onClick={doFind} disabled={loading}>🔍 查詢</button>
              </div>
              <div className="field-hint">格式：PO-YYYYMMDD-NNN</div>
            </div>
            <div className="field">
              <div className="field-label">進貨日期</div>
              <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
            </div>
            <div className="field">
              <div className="field-label">供應商</div>
              <input type="text" value={supplier} readOnly className={supplier ? 'auto-filled' : ''} placeholder="由採購單帶入" />
              <div className="field-hint">由採購單自動帶入</div>
            </div>
            <div className="field col2">
              <div className="field-label">備註</div>
              <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="（選填）" />
            </div>
          </div>
        </div>
      </div>

      {/* 效期資料 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📅 效期資料</div>
          <span className="badge badge-warn">三欄填任意兩欄，第三欄自動計算</span>
        </div>
        <div className="card-body">
          <div className="expiry-box">
            <div className="expiry-title">⚠️ 效期填寫規則（三選二）</div>
            <div className="expiry-rule">
              只需填寫以下三個欄位中的<strong>任意兩個</strong>，系統會自動計算第三個。<br />
              ① 製造日期 ＋ ② 有效日期 → 自動算出保存期限<br />
              ① 製造日期 ＋ ③ 保存期限 → 自動算出有效日期<br />
              ② 有效日期 ＋ ③ 保存期限 → 自動算出製造日期
            </div>
            <div className="form-row-3">
              <div className="field">
                <div className="field-label">① 製造日期</div>
                <input type="date" value={mfgDate} onChange={(e) => handleExpiryChange('mfg', e.target.value)} />
              </div>
              <div className="field">
                <div className="field-label">② 有效日期</div>
                <input type="date" value={expDate} onChange={(e) => handleExpiryChange('exp', e.target.value)} className={expDate ? 'auto-filled' : ''} />
                <div className="field-hint">🔵 可自動計算</div>
              </div>
              <div className="field">
                <div className="field-label">③ 保存期限（天）</div>
                <input type="number" value={shelfDays} onChange={(e) => handleExpiryChange('shelf', e.target.value)} placeholder="天數" min="1" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 品項明細 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📦 品項明細</div>
          <button className="btn btn-outline btn-sm" onClick={() => setItems([...items, EMPTY_ITEM()])}>＋ 新增列</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '32px' }}>#</th>
                <th>品號 <span style={{ color: 'var(--err)' }}>*</span></th>
                <th>品名（自動帶入）</th>
                <th>對照號</th>
                <th>單箱數量 <span style={{ color: 'var(--err)' }}>*</span></th>
                <th>總進貨數量 <span style={{ color: 'var(--err)' }}>*</span></th>
                <th>總箱數（自動）</th>
                <th>列印張數 <span style={{ color: 'var(--err)' }}>*</span></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="row-no">{idx + 1}</td>
                  <td>
                    <input type="text" value={item.product_code} style={{ width: '100px' }} placeholder="品號"
                      onChange={(e) => autoFillName(idx, e.target.value)} />
                  </td>
                  <td>
                    <input type="text" value={item.product_name} readOnly style={{ width: '130px' }}
                      className={item.product_name ? 'auto-filled' : ''} placeholder="自動帶入" />
                  </td>
                  <td><input type="text" value={item.ref_code} style={{ width: '80px' }} placeholder="（選填）"
                    onChange={(e) => updateItem(idx, 'ref_code', e.target.value)} /></td>
                  <td><input type="number" value={item.qty_per_box} style={{ width: '70px' }} min="1"
                    onChange={(e) => updateItem(idx, 'qty_per_box', Number(e.target.value))} /></td>
                  <td><input type="number" value={item.total_qty} style={{ width: '80px' }} min="1"
                    onChange={(e) => updateItem(idx, 'total_qty', Number(e.target.value))} /></td>
                  <td><input type="number" value={item.total_boxes} style={{ width: '70px' }} readOnly
                    className={item.total_boxes ? 'auto-filled' : ''} /></td>
                  <td><input type="number" value={item.print_copies} style={{ width: '60px' }} min="1"
                    onChange={(e) => updateItem(idx, 'print_copies', Number(e.target.value))} /></td>
                  <td>
                    <button className="del-btn" onClick={() => setItems(items.filter((_, i) => i !== idx))}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="btn-bar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>🖨 執行列印</button>
        <button className="btn btn-outline">👁 預覽標籤樣式</button>
        <button className="btn btn-ghost" onClick={() => setItems([EMPTY_ITEM()])}>🗑 清除全部</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '12px', color: 'var(--soft)' }}>
          共 {items.filter((i) => i.product_code).length} 筆，合計 {totalCopies} 張
        </span>
      </div>

      {/* 列印確認 Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--g1)', marginBottom: '12px' }}>🖨 確認列印</div>
            <div style={{ fontSize: '13.5px', color: 'var(--mid)', lineHeight: 1.8, marginBottom: '20px' }}>
              即將列印 <strong style={{ color: 'var(--g1)', fontSize: '16px' }}>{totalCopies} 張</strong> 標籤，
              共 {items.filter((i) => i.product_code).length} 個品項。<br />
              印表機：<strong>Zebra ZT230 - 倉儲A線</strong><br />
              <span style={{ color: 'var(--soft)', fontSize: '12px' }}>確認後標籤將直接送至條碼機列印，請確保紙張已備妥。</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={doPrint} disabled={loading}>✓ 確認列印</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
