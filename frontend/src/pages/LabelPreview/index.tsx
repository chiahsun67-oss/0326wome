export default function LabelPreview() {
  const now = new Date();
  const stamp = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')} ${now.toTimeString().slice(0,8)}`;

  return (
    <div>
      <div className="uat-notice">
        <div style={{ fontSize: '20px', flexShrink: 0 }}>📋</div>
        <div className="uat-notice-text">
          <strong>實務確認說明：</strong>以下為實際列印的標籤樣式（8×11 公分）。請確認標籤上各欄位的名稱、位置、格式是否符合實際貼標需求。如需調整請在「確認簽核」頁面標注。
        </div>
      </div>
      <div className="page-title">
        <h2>🏷 麥頭標籤樣式確認</h2>
        <p>標籤尺寸：8 cm（寬）× 11 cm（高）；使用 Zebra 條碼機列印</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">標籤預覽（實際比例）</div>
          <span className="badge badge-new">等比展示，非縮小版</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* 標籤卡片 */}
            <div>
              <div style={{ fontSize: '11px', color: 'var(--soft)', marginBottom: '8px', textAlign: 'center' }}>⬇ 實際列印樣式</div>
              <div className="label-card">
                <div className="lc-code">50037631</div>
                <div className="lc-name">吉伊卡哇透明直傘</div>
                <div className="lc-row"><span>Qty/Box: 24</span><span>Boxes: 20</span></div>
                <div className="lc-row"><span>MFG: 2024-06-01</span></div>
                <div className="lc-row"><span>EXP: 2025-06-01</span></div>
                <div className="lc-row"><span>Shelf: 365 days</span></div>
                <div className="lc-barcode">|||||||||||</div>
                <div className="lc-barcode-text">50037631 / 0741310</div>
                <div className="lc-stamp">{stamp}</div>
              </div>
            </div>

            {/* 說明 */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--g1)', marginBottom: '14px' }}>各欄位說明</div>
              {[
                ['品號', '（最上方大字）：商品的唯一編號，條碼也會對應此號碼'],
                ['品名', '：商品中文名稱，由系統自動帶入'],
                ['Qty/Box', '（每箱數量）：每一箱裝幾個'],
                ['Boxes', '（總箱數）：本次進貨幾箱'],
                ['MFG / EXP / Shelf', '：製造日期、有效日期、保存期限'],
                ['條碼', '：Code 128 格式，對應品號，可直接掃描'],
                ['條碼下方文字', '：品號 / 對照號（如有對照號才顯示）'],
                ['右下角時間戳記', '：列印時間，格式 日/月 時:分:秒，供稽核用'],
              ].map(([strong, rest]) => (
                <div key={strong} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--g2)', flexShrink: 0, marginTop: '5px' }} />
                  <div style={{ fontSize: '12.5px', color: 'var(--ink)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--g1)' }}>{strong}</strong>{rest}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="divider" />
          <div className="tip">
            <div className="tip-icon">❓</div>
            <div className="tip-text">
              如需修改標籤上的欄位顯示方式（例如：中文標籤文字、欄位增減、字體大小），請在「確認簽核」頁面中備注，開發人員會根據您的意見調整。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
