import { ModuleId } from '../types';

interface SideBarItem { id: ModuleId; label: string; section: string }
const ITEMS: SideBarItem[] = [
  { id: 'm020',    label: '麥頭標籤套印',    section: '進貨作業' },
  { id: 'm030',    label: 'Excel 批次匯入',  section: '進貨作業' },
  { id: 'label',   label: '標籤樣式確認',    section: '標籤與紀錄' },
  { id: 'history', label: '列印紀錄查詢',    section: '標籤與紀錄' },
  { id: 'confirm', label: '確認簽核',        section: '驗收' },
];

interface Props { current: ModuleId; onSwitch: (id: ModuleId) => void }

export default function SideBar({ current, onSwitch }: Props) {
  const sections = [...new Set(ITEMS.map((i) => i.section))];
  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: 'var(--white)', borderRight: '1px solid var(--faint)',
      padding: '20px 0',
    }}>
      {sections.map((sec) => (
        <div key={sec} style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '.12em',
            color: 'var(--soft)', textTransform: 'uppercase',
            padding: '0 18px', marginBottom: '8px',
          }}>{sec}</div>
          {ITEMS.filter((i) => i.section === sec).map((item) => {
            const active = current === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSwitch(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 18px', cursor: 'pointer', fontSize: '12.5px',
                  color: active ? 'var(--g1)' : 'var(--mid)',
                  background: active ? 'var(--g3)' : 'transparent',
                  borderLeft: active ? '3px solid var(--g1)' : '3px solid transparent',
                  fontWeight: active ? 600 : 400,
                  transition: 'all .15s',
                }}
              >
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: active ? 'var(--g2)' : 'var(--faint)',
                  flexShrink: 0,
                }} />
                {item.label}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
