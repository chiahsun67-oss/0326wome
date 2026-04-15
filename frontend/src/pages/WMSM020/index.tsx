import { useState } from 'react';
import { api } from '../../api/client';
import { POItem } from '../../types';
import { printLabels, LabelData } from '../../utils/printLabels';

type WorkItem = POItem & { master_shelf_days: number | null; selected: boolean };

interface Props { onToast: (msg: string) => void; onSwitchHistory: () => void; operator?: string; }

function WmsmLabel({ d }: { d: LabelData }) {
  return (
    <div className="wmsm-label">
      <div className="wl-row2">
        <div className="wl-cell">
          <span className="wl-key">品號品號：</span>
          <span className="wl-val">{d.product_code || '—'}</span>
        </div>
        <div className="wl-cell">
          <span className="wl-key">品名名稱：</span>
          <span className="wl-val">{d.product_name || '—'}</span>
        </div>
      </div>
      <div className="wl-row2">
        <div className="wl-cell">
          <span className="wl-key">箱內總箱入數：</span>
          <span className="wl-val">
            {d.box_qty || '—'}
            {d.is_tail && <span style={{ fontSize: '10px', color: '#b45309', marginLeft: 4 }}>（尾數箱）</span>}
          </span>
        </div>
        <div className="wl-cell">
          <span className="wl-key">箱數總數位數（根據實際數值）：</span>
          <span className="wl-val">{d.total_boxes || '—'}</span>
        </div>
      </div>
      <div className="wl-box-breakdown">
        {d.is_tail ? (
          <div className="wl-breakdown-row wl-tail">
            <span className="wl-key">⚠ 尾數箱：</span>
            <span className="wl-val-sm">本箱 {d.box_qty} 個（未滿箱，每箱標準 {d.qty_per_box} 個）</span>
          </div>
        ) : (
          <div className="wl-breakdown-row">
            <span className="wl-key">整　　箱：</span>
            <span className="wl-val-sm">本箱 {d.box_qty} 個（整箱）</span>
          </div>
        )}
      </div>
      <div className="wl-remark">
        備註：第 <strong style={{ fontSize: '15px' }}>{d.box_no}</strong> 箱／共{' '}
        <strong style={{ fontSize: '15px' }}>{d.total_boxes}</strong> 箱
      </div>
      <div className="wl-remark-blank" />
      <div className="wl-row3">
        <div className="wl-cell">
          <span className="wl-key">製造日期：</span>
          <span className="wl-val">{d.mfg_date || '—'}</span>
        </div>
        <div className="wl-cell">
          <span className="wl-key">保存期限：</span>
          <span className="wl-val">{d.shelf_days !== '' ? `${d.shelf_days} 天` : '—'}</span>
        </div>
        <div className="wl-cell">
          <span className="wl-key">有效日期：</span>
          <span className="wl-val">{d.exp_date || '—'}</span>
        </div>
      </div>
      <div className="wl-sub">（三擇一填寫）</div>
    </div>
  );
}

const EMPTY_ITEM = (): WorkItem => ({
  product_code: '', product_name: '', ref_code: '',
  qty_per_box: '', total_qty: '', total_boxes: '',
  print_copies: 1, mfg_date: '', exp_date: '', shelf_days: '',
  master_shelf_days: null,
  selected: true,
});

function calcShelfDays(mfg: string, exp: string): number | null {
  if (!mfg || !exp) return null;
  return Math.round((new Date(exp).getTime() - new Date(mfg).getTime()) / 86400000);
}

export default function WMSM020({ onToast, onSwitchHistory, operator = '倉儲人員' }: Props) {
  const [poNo, setPoNo]           = useState('PO-20250311-001');
  const [poDate, setPoDate]       = useState('2025-03-11');
  const [supplier, setSupplier]   = useState('');
  const [remark, setRemark]       = useState('');
  const [items, setItems]         = useState<WorkItem[]>([EMPTY_ITEM(), EMPTY_ITEM()]);
  const [showModal, setShowModal] = useState(false);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [loading, setLoading]     = useState(false);

  const allSelected = items.length > 0 && items.every(i => i.selected);

  /** 每箱展開一筆 LabelData（只處理已勾選品項），尾數箱自動標示 */
  const labelDataList = (): LabelData[] => {
    const result: LabelData[] = [];
    for (const i of items.filter(x => x.product_code && x.selected)) {
      const qpb        = Number(i.qty_per_box) || 0;
      const tq         = Number(i.total_qty)   || 0;
      const totalBoxes = qpb > 0 && tq > 0 ? Math.ceil(tq / qpb) : (Number(i.total_boxes) || 0);
      const remainder  = qpb > 0 && tq > 0 ? tq % qpb : 0;
      const shelfDays  = calcShelfDays(i.mfg_date, i.exp_date);
      for (let n = 1; n <= totalBoxes; n++) {
        const isTail = remainder > 0 && n === totalBoxes;
        result.push({
          product_code: i.product_code,
          product_name: i.product_name,
          qty_per_box:  qpb,
          box_qty:      isTail ? remainder : qpb,
          box_no:       n,
          total_boxes:  totalBoxes,
          is_tail:      isTail,
          mfg_date:     i.mfg_date,
          exp_date:     i.exp_date,
          shelf_days:   shelfDays ?? '',
        });
      }
    }
    return result;
  };

  const handlePrint = () => {
    const err = printLabels(labelDataList());
    if (err) onToast(err);
  };

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
          qty_per_box:       i.qty_per_box,
          total_qty:         i.total_qty,
          total_boxes:       i.total_boxes,
          print_copies:      i.total_boxes,
          mfg_date:          i.mfg_date ?? '',
          exp_date:          i.exp_date  ?? '',
          shelf_days:        i.shelf_days ?? '',
          master_shelf_days: typeof i.shelf_days === 'number' ? i.shelf_days : null,
          selected:          true,
        })));
        onToast(`✓ 採購單 ${poNo} 帶入 ${res.data.items.length} 筆商品，請確認效期後勾選執行列印`);
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
      newItems[idx] = {
        ...newItems[idx],
        product_name:      res.data.name,
        ref_code:          res.data.ref_code,
        master_shelf_days: res.data.shelf_days ?? null,
      };
      setItems([...newItems]);
    }
  };

  const updateItem = (idx: number, field: keyof POItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[idx], [field]: value };
    // 輸入製造日期且品項有主檔保存期限 → 自動推算有效日期
    if (field === 'mfg_date' && typeof value === 'string' && value && item.master_shelf_days !== null) {
      const dt = new Date(value);
      dt.setDate(dt.getDate() + item.master_shelf_days);
      item.exp_date = dt.toISOString().slice(0, 10);
    }
    // 自動計算 total_boxes 並同步列印張數
    const box   = Number(field === 'qty_per_box' ? value : item.qty_per_box);
    const total = Number(field === 'total_qty'   ? value : item.total_qty);
    if (box > 0 && total > 0) {
      const boxes = Math.ceil(total / box);
      item.total_boxes  = boxes;
      item.print_copies = boxes;
    }
    newItems[idx] = item;
    setItems(newItems);
  };

  const toggleSelect = (idx: number) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], selected: !newItems[idx].selected };
    setItems(newItems);
  };

  const toggleAll = () => {
    setItems(items.map(i => ({ ...i, selected: !allSelected })));
  };

  const selectedItems   = items.filter(i => i.selected && i.product_code);
  const totalCopies     = selectedItems.reduce((s, i) => s + Number(i.print_copies || 0), 0);

  // 已勾選品項中，有主檔保存期限且效期天數不符者
  const expiryMismatches = selectedItems.filter(i => {
    if (i.master_shelf_days === null) return false;
    const computed = calcShelfDays(i.mfg_date, i.exp_date);
    return computed !== null && computed !== i.master_shelf_days;
  });

  const doPrint = async () => {
    setLoading(true);
    try {
      const res = await api.createPrintJob({
        source_module: 'WMSM020',
        po_no:         poNo.trim() || undefined,
        operator,
        items: selectedItems.map((i) => ({
          product_code:  i.product_code,
          product_name:  i.product_name,
          ref_code:      i.ref_code,
          qty_per_box:   Number(i.qty_per_box)  || 1,
          total_qty:     Number(i.total_qty)    || 0,
          total_boxes:   Number(i.total_boxes)  || 0,
          print_copies:  Number(i.print_copies) || 1,
          mfg_date:      i.mfg_date || null,
          exp_date:      i.exp_date  || null,
          shelf_days:    calcShelfDays(i.mfg_date, i.exp_date),
        })),
      });
      setShowModal(false);
      if (res.success) {
        onToast(res.message ?? `🖨 列印指令已送出，共 ${res.data?.total_copies} 張`);
        setShowLabelPreview(true);
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
        <p>適用情境：進貨時手動輸入商品資料，或透過採購單號批次帶入，勾選品項並填寫效期後列印麥頭標籤。</p>
      </div>

      {/* 步驟 */}
      <div className="step-guide">
        {['輸入採購單號', '勾選品項並填寫效期', '確認張數列印'].map((s, i) => (
          <div key={i} className={`sg-step ${i === 0 ? 'done' : i === 1 ? 'current' : ''}`}>
            <div className="sg-num">步驟 {i + 1}</div>
            <div className="sg-title">{s}</div>
          </div>
        ))}
      </div>

      <div className="tip">
        <div className="tip-icon">💡</div>
        <div className="tip-text">
          <strong>有採購單號時：</strong>輸入採購單號並按「查詢」帶入品項，勾選欲列印的品項並填寫製造日期及有效日期，系統自動比對商品主檔保存期限。<br />
          <strong>無採購單號時：</strong>按「新增列」手動逐筆輸入品號及效期。
        </div>
      </div>

      {/* 採購單查詢 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔍 採購單查詢（選填）</div>
          <span className="badge badge-new">可略過，直接手動填寫</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr 1fr', gap: '12px' }}>
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

      {/* 品項明細（含效期） */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📦 品項明細</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {expiryMismatches.length > 0 && (
              <span className="badge badge-err">⚠ {expiryMismatches.length} 筆效期與主檔不符</span>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => setItems([...items, EMPTY_ITEM()])}>＋ 新增列</button>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} title="全選／取消全選" />
                </th>
                <th style={{ width: '28px' }}>#</th>
                <th>品號 <span style={{ color: 'var(--err)' }}>*</span></th>
                <th>品名</th>
                <th>對照號</th>
                <th>單箱數 <span style={{ color: 'var(--err)' }}>*</span></th>
                <th>總數量 <span style={{ color: 'var(--err)' }}>*</span></th>
                <th>總箱數</th>
                <th>製造日期</th>
                <th>有效日期</th>
                <th>保存期限（天）</th>
                <th style={{ width: '60px', textAlign: 'center' }}>效期</th>
                <th>列印張數 <span style={{ color: 'var(--err)' }}>*</span></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const computed  = calcShelfDays(item.mfg_date, item.exp_date);
                const hasMaster = item.master_shelf_days !== null;
                const mismatch  = hasMaster && computed !== null && computed !== item.master_shelf_days;
                const okMatch   = hasMaster && computed !== null && computed === item.master_shelf_days;
                return (
                  <tr key={idx} style={{ opacity: item.selected ? 1 : 0.5 }}>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={item.selected} onChange={() => toggleSelect(idx)} />
                    </td>
                    <td className="row-no">{idx + 1}</td>
                    <td>
                      <input type="text" value={item.product_code} style={{ width: '90px' }} placeholder="品號"
                        onChange={(e) => autoFillName(idx, e.target.value)} />
                    </td>
                    <td>
                      <input type="text" value={item.product_name} readOnly style={{ width: '120px' }}
                        className={item.product_name ? 'auto-filled' : ''} placeholder="自動帶入" />
                    </td>
                    <td>
                      <input type="text" value={item.ref_code} style={{ width: '70px' }} placeholder="（選填）"
                        onChange={(e) => updateItem(idx, 'ref_code', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" value={item.qty_per_box} style={{ width: '60px' }} min="1"
                        onChange={(e) => updateItem(idx, 'qty_per_box', Number(e.target.value))} />
                    </td>
                    <td>
                      <input type="number" value={item.total_qty} style={{ width: '70px' }} min="1"
                        onChange={(e) => updateItem(idx, 'total_qty', Number(e.target.value))} />
                    </td>
                    <td>
                      <input type="number" value={item.total_boxes} style={{ width: '60px' }} readOnly
                        className={item.total_boxes ? 'auto-filled' : ''} />
                    </td>
                    <td>
                      <input type="date" value={item.mfg_date} style={{ width: '130px' }}
                        onChange={(e) => updateItem(idx, 'mfg_date', e.target.value)} />
                    </td>
                    <td>
                      <input type="date" value={item.exp_date} style={{ width: '130px' }}
                        onChange={(e) => updateItem(idx, 'exp_date', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" value={computed ?? ''} readOnly style={{ width: '75px' }}
                        className={computed !== null ? 'auto-filled' : ''}
                        placeholder="自動計算" />
                      {hasMaster && (
                        <div style={{ fontSize: '10px', color: 'var(--soft)', marginTop: '2px' }}>
                          主檔：{item.master_shelf_days} 天
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {mismatch && (
                        <span title={`主檔：${item.master_shelf_days} 天，填寫：${computed} 天`}
                          style={{ color: '#d97706', fontSize: '16px', cursor: 'default' }}>⚠️</span>
                      )}
                      {okMatch && (
                        <span style={{ color: '#16a34a', fontSize: '16px' }}>✓</span>
                      )}
                    </td>
                    <td>
                      <input type="number" value={item.print_copies} style={{ width: '55px' }} min="1"
                        onChange={(e) => updateItem(idx, 'print_copies', Number(e.target.value))} />
                    </td>
                    <td>
                      <button className="del-btn" onClick={() => setItems(items.filter((_, i) => i !== idx))}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 效期不符彙總警示 */}
      {expiryMismatches.length > 0 && (
        <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px' }}>
          <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>
            ⚠️ 以下已勾選品項之保存期限與商品主檔不符，請確認後再執行列印：
          </div>
          {expiryMismatches.map((i, idx) => (
            <div key={idx} style={{ fontSize: '12.5px', color: '#78350f', lineHeight: 1.8 }}>
              【{i.product_code}】{i.product_name}：主檔 {i.master_shelf_days} 天，目前填寫 {calcShelfDays(i.mfg_date, i.exp_date)} 天
            </div>
          ))}
        </div>
      )}

      <div className="btn-bar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={selectedItems.length === 0}>🖨 執行列印</button>
        <button className="btn btn-outline" onClick={() => setShowLabelPreview(true)}>👁 預覽標籤樣式</button>
        <button className="btn btn-ghost" onClick={() => setItems([EMPTY_ITEM()])}>🗑 清除全部</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '12px', color: 'var(--soft)' }}>
          已勾選 {selectedItems.length} 筆，合計 {totalCopies} 張
        </span>
      </div>

      {/* 標籤預覽 Modal */}
      {showLabelPreview && (
        <div className="modal-overlay" onClick={() => setShowLabelPreview(false)}>
          <div className="modal-wide no-print" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--g1)' }}>🏷 麥頭標籤預覽</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline btn-sm" onClick={handlePrint}>🖨 列印此頁</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowLabelPreview(false); onSwitchHistory(); }}>✓ 完成，前往歷史</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowLabelPreview(false)}>✕ 關閉</button>
              </div>
            </div>
            <div className="print-area" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {labelDataList().length === 0
                ? <div style={{ color: 'var(--soft)', fontSize: '13px' }}>尚無已勾選品項，請先勾選品項明細</div>
                : labelDataList().map((d, i) => <WmsmLabel key={i} d={d} />)
              }
            </div>
          </div>
        </div>
      )}

      {/* 列印確認 Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--g1)', marginBottom: '12px' }}>🖨 確認列印</div>
            {expiryMismatches.length > 0 && (
              <div style={{ marginBottom: '14px', padding: '8px 12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '12.5px', color: '#92400e' }}>
                ⚠️ 注意：有 {expiryMismatches.length} 筆效期與商品主檔不符，確定仍要列印？
              </div>
            )}
            <div style={{ fontSize: '13.5px', color: 'var(--mid)', lineHeight: 1.8, marginBottom: '20px' }}>
              即將列印 <strong style={{ color: 'var(--g1)', fontSize: '16px' }}>{totalCopies} 張</strong> 標籤，
              共 {selectedItems.length} 個品項。<br />
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
