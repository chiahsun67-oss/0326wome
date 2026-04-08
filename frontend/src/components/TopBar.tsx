interface Props {
  operator?: string;
  onLogout?: () => void;
}

export default function TopBar({ operator, onLogout }: Props) {
  return (
    <div style={{
      background: 'var(--g1)', padding: '0 28px', height: '56px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 2px 8px rgba(0,0,0,.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '34px', height: '34px', background: 'rgba(255,255,255,.15)',
          borderRadius: '8px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '18px',
        }}>🏷</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', letterSpacing: '.03em' }}>
            MIS 倉儲管理系統
          </div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '11px', marginTop: '1px' }}>
            WMSM 麥頭印標作業
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          background: 'var(--warn)', color: '#7c2d00', fontWeight: 700,
          fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
        }}>📋 實務確認版</div>
        <div style={{
          background: 'rgba(255,255,255,.12)', color: '#fff',
          fontSize: '12px', padding: '5px 12px', borderRadius: '20px',
        }}>👤 {operator ?? '倉儲人員'}</div>
        {onLogout && (
          <button onClick={onLogout} style={{
            background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.8)',
            border: '1px solid rgba(255,255,255,.2)', borderRadius: '20px',
            fontSize: '11.5px', padding: '5px 12px', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'background .15s',
          }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.22)')}
            onMouseOut={(e)  => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
          >登出</button>
        )}
      </div>
    </div>
  );
}
