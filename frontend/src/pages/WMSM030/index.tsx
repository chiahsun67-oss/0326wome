import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { ImportBatchItem, ImportPreviewResult } from '../../types';
import { printLabels, LabelData } from '../../utils/printLabels';

function labelDataList030(items: ImportBatchItem[]): LabelData[] {
  const result: LabelData[] = [];
  for (const item of items.filter((x) => x.row_status !== 'error')) {
    const qpb = item.qty_per_box ?? 0;
    const tq  = item.total_qty   ?? 0;
    const totalBoxes = qpb > 0 && tq > 0 ? Math.ceil(tq / qpb) : (item.total_boxes ?? 0);
    const remainder  = qpb > 0 && tq > 0 ? tq % qpb : 0;
    for (let n = 1; n <= totalBoxes; n++) {
      const isTail = remainder > 0 && n === totalBoxes;
      result.push({
        product_code: item.product_code ?? '',
        product_name: item.product_name ?? '',
        qty_per_box:  qpb,
        box_qty:      isTail ? remainder : qpb,
        box_no:       n,
        total_boxes:  totalBoxes,
        is_tail:      isTail,
        mfg_date:     item.mfg_date ?? '',
        exp_date:     item.exp_date ?? '',
        shelf_days:   item.shelf_days ?? '',
      });
    }
  }
  return result;
}

interface Props { onToast: (msg: string) => void }

export default function WMSM030({ onToast }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      onToast('✗ 僅支援 .xlsx 格式');
      return;
    }
    setLoading(true);
    try {
      const res = await api.previewImport(file);
      if (res.success && res.data) {
        setPreview(res.data);
        onToast(`📂 已解析 ${res.data.total_rows} 筆，請確認預覽結果`);
      } else {
        onToast(`✗ ${res.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const executePrint = async () => {
    if (!preview) return;
    setLoading(true);
    const itemsSnapshot = preview.items;
    try {
      const res = await api.executeImport(preview.batch_no, '倉儲人員');
      if (res.success) {
        onToast(res.message ?? `🖨 批次列印完成，共 ${res.data?.total_copies} 張`);
        setPreview(null);
        const err = printLabels(labelDataList030(itemsSnapshot));
        if (err) onToast(err);
      } else {
        onToast(`✗ ${res.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasError = preview ? preview.err_rows > 0 : false;

  return (
    <div>
      <div className="uat-notice">
        <div style={{ fontSize: '20px', flexShrink: 0 }}>📋</div>
        <div className="uat-notice-text">
          <strong>實務確認說明：</strong>此畫面為 WMSM030 Excel 批次匯入作業。適用於進貨數量多、需大量列印時。
        </div>
      </div>
      <div className="page-title">
        <h2><span className="module-tag">WMSM030</span> 進貨麥頭標籤 Excel 批次匯入</h2>
        <p>適用情境：一次進貨多個品項（建議 5 筆以上），預先在 Excel 填好資料後，一次上傳批次列印。</p>
      </div>

      <div className="step-guide">
        {['下載 Excel 範本','填好資料後上傳','確認預覽','執行轉檔列印'].map((s, i) => (
          <div key={i} className={`sg-step ${i === 0 ? 'done' : i === 1 ? 'current' : ''}`}>
            <div className="sg-num">步驟 {i+1}</div>
            <div className="sg-title">{s}</div>
          </div>
        ))}
      </div>

      <div className="tip">
        <div className="tip-icon">📥</div>
        <div className="tip-text">
          <strong>第一次使用請先下載範本：</strong>點擊「下載 Excel 範本」，按照範本格式填寫，再回來上傳。
          範本內有每個欄位的說明，請勿刪除標題列或改變欄位順序。
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📤 上傳 Excel 檔案</div>
          <a
            href="/api/import/template"
            download="WMSM030_template.xlsx"
            className="btn btn-ghost btn-sm"
            style={{ textDecoration: 'none' }}
          >⬇ 下載 Excel 範本</a>
        </div>
        <div className="card-body">
          <input ref={inputRef} type="file" accept=".xlsx" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          <div className="dropzone"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="dropzone-icon">{loading ? '⏳' : '📂'}</div>
            <div className="dropzone-text">
              {loading ? '解析中...' : '點此選擇檔案，或將 Excel 拖放至此'}
            </div>
            <div className="dropzone-sub">支援格式：.xlsx &nbsp;|&nbsp; 建議不超過 500 筆</div>
          </div>
        </div>
      </div>

      {preview && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔍 匯入預覽</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-ok">✓ 正常 {preview.ok_rows} 筆</span>
              {preview.warn_rows > 0 && <span className="badge badge-warn">⚠ 警告 {preview.warn_rows} 筆</span>}
              {preview.err_rows > 0 && <span className="badge badge-err">✗ 錯誤 {preview.err_rows} 筆</span>}
            </div>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="import-tbl">
              <thead>
                <tr>
                  <th>列#</th><th>狀態</th><th>品號</th><th>對照號</th><th>品名</th>
                  <th>單箱數</th><th>總進貨</th><th>總箱數</th>
                  <th>製造日期</th><th>有效日期</th><th>保存期限</th><th>列印張數</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((item) => (
                  <tr key={item.row_no} className={`row-${item.row_status}`}>
                    <td>{item.row_no}</td>
                    <td>
                      {item.row_status === 'ok'    && <span className="badge badge-ok">✓ 正常</span>}
                      {item.row_status === 'warn'  && <span className="badge badge-warn">⚠ 警告</span>}
                      {item.row_status === 'error' && <span className="badge badge-err">✗ 錯誤</span>}
                    </td>
                    <td className="mono" style={{ color: item.row_status === 'error' ? 'var(--err)' : undefined }}>
                      {item.product_code}
                    </td>
                    <td className="mono">{item.ref_code || '—'}</td>
                    <td>{item.product_name || <span style={{ color: 'var(--soft)' }}>（品號不存在）</span>}</td>
                    <td>{item.qty_per_box}</td>
                    <td>{item.total_qty}</td>
                    <td className="auto-calc">{item.total_boxes}</td>
                    <td>{item.mfg_date}</td>
                    <td>{item.exp_date}</td>
                    <td>{item.shelf_days}</td>
                    <td>{item.print_copies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 錯誤清單 */}
          {preview.err_rows > 0 && (
            <div style={{ padding: '14px 18px', background: 'var(--errbg)', borderTop: '1px solid var(--errbd)' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--err)', marginBottom: '6px' }}>✗ 錯誤清單（需修正後才可執行列印）</div>
              {preview.items.filter((i) => i.row_status === 'error').map((item) =>
                item.messages.filter((m) => m.type === 'error').map((m, mi) => (
                  <div key={`${item.row_no}-${mi}`} style={{ fontSize: '12px', color: '#7f1d1d' }}>
                    第 {item.row_no} 列：{m.message}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 警告清單 */}
          {preview.warn_rows > 0 && (
            <div style={{ padding: '14px 18px', background: 'var(--warnbg)', borderTop: '1px solid var(--warnbd)' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>⚠ 警告清單（可繼續執行，但請確認）</div>
              {preview.items.filter((i) => i.row_status === 'warn').map((item) =>
                item.messages.filter((m) => m.type === 'warn').map((m, mi) => (
                  <div key={`${item.row_no}-${mi}`} style={{ fontSize: '12px', color: '#78350f' }}>
                    第 {item.row_no} 列：{m.message}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="btn-bar">
        <button
          className="btn btn-primary"
          disabled={!preview || hasError || loading}
          onClick={executePrint}
        >
          🖨 轉檔結轉列印{hasError ? '（有錯誤，請先修正）' : ''}
        </button>
        <button className="btn btn-ghost" onClick={() => { setPreview(null); }}>🔄 重新上傳</button>
      </div>
    </div>
  );
}
