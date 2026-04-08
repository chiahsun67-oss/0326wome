export interface LabelData {
  product_code: string;
  product_name: string;
  qty_per_box: number;   // 標準每箱數量
  box_qty: number;       // 本箱實際數量（尾數箱時不同）
  box_no: number;        // 本張標籤是第幾箱（1-based）
  total_boxes: number;   // 此品項總箱數
  is_tail: boolean;      // 是否為尾數箱
  mfg_date: string;
  exp_date: string;
  shelf_days: number | '';
}

function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 開啟新視窗並列印標籤。回傳 null = 成功；回傳 string = 錯誤訊息。 */
export function printLabels(labels: LabelData[]): string | null {
  if (labels.length === 0) return '✗ 尚無品項資料';

  const labelHtml = labels.map((d) => {
    const typeRow = d.is_tail
      ? `<div class="brow tail">⚠ 尾數箱：本箱 <b>${d.box_qty}</b> 個（未滿箱，每箱標準 ${d.qty_per_box} 個）</div>`
      : `<div class="brow">整　　箱：本箱 <b>${d.box_qty}</b> 個（整箱）</div>`;

    return `
      <div class="label">
        <div class="row2">
          <div class="cell"><div class="key">品號品號：</div><div class="val">${esc(d.product_code) || '—'}</div></div>
          <div class="cell"><div class="key">品名名稱：</div><div class="val">${esc(d.product_name) || '—'}</div></div>
        </div>
        <div class="row2">
          <div class="cell"><div class="key">箱內總箱入數：</div>
            <div class="val">${d.box_qty || '—'}${d.is_tail ? '<span class="tail-note">（尾數箱）</span>' : ''}</div>
          </div>
          <div class="cell"><div class="key">箱數總數位數（根據實際數值）：</div><div class="val">${d.total_boxes || '—'}</div></div>
        </div>
        <div class="breakdown">${typeRow}</div>
        <div class="remark">備註：第 <b class="boxno">${d.box_no}</b> 箱／共 <b class="boxno">${d.total_boxes}</b> 箱</div>
        <div class="remark-blank"></div>
        <div class="row3">
          <div class="cell"><div class="key">製造日期：</div><div class="val">${esc(d.mfg_date) || '—'}</div></div>
          <div class="cell"><div class="key">保存期限：</div><div class="val">${d.shelf_days !== '' ? esc(d.shelf_days) + ' 天' : '—'}</div></div>
          <div class="cell"><div class="key">有效日期：</div><div class="val">${esc(d.exp_date) || '—'}</div></div>
        </div>
        <div class="sub">（三擇一填寫）</div>
      </div>`;
  }).join('');

  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) return '✗ 無法開啟列印視窗，請允許彈出視窗';

  win.document.write(`<!DOCTYPE html><html lang="zh-TW"><head>
    <meta charset="UTF-8">
    <title>麥頭標籤列印</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap');
      @page { size: A4 portrait; margin: 10mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Noto Sans TC', sans-serif; background: #fff; }
      .labels { display: flex; flex-wrap: wrap; gap: 8mm; padding: 4mm; }

      /* ── 標籤主體 8cm × 11cm ── */
      .label {
        width: 8cm; height: 11cm;
        border: 1.5px dashed #555;
        display: flex; flex-direction: column;
        font-size: 12px; color: #111;
        break-inside: avoid; page-break-inside: avoid;
        overflow: hidden;
      }
      .row2 { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #888; }
      .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; }
      .cell { padding: 5px 7px; border-right: 1px solid #888; display: flex; flex-direction: column; gap: 1px; }
      .cell:last-child { border-right: none; }
      .key { font-size: 9.5px; color: #444; white-space: nowrap; }
      .val { font-size: 13px; font-weight: 700; word-break: break-all; }
      .breakdown { padding: 5px 7px; border-bottom: 1px solid #888; flex: 1; display: flex; flex-direction: column; gap: 3px; }
      .brow { font-size: 11px; }
      .brow.tail { color: #b45309; }
      .brow.gray { color: #999; }
      .tail-note { font-size: 9.5px; color: #b45309; margin-left: 4px; }
      .boxno { font-size: 16px; }
      .remark { padding: 5px 7px 3px; border-bottom: 1px solid #888; font-size: 12px; }
      .remark-blank { flex: 1; border-bottom: 1px solid #888; min-height: 18px; }
      .sub { padding: 4px 7px; font-size: 10px; color: #666; text-align: center; }
    </style>
  </head><body>
    <div class="labels">${labelHtml}</div>
    <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  win.document.close();
  return null;
}
