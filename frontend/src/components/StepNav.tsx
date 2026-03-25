import { ModuleId } from '../types';

const TABS: { id: ModuleId; label: string; num: string }[] = [
  { id: 'm020',    label: 'WMSM020 套印作業',   num: '1' },
  { id: 'm030',    label: 'WMSM030 Excel 匯入', num: '2' },
  { id: 'label',   label: '標籤樣式確認',        num: '3' },
  { id: 'history', label: '列印紀錄查詢',        num: '4' },
  { id: 'confirm', label: '確認簽核',            num: '✓' },
];

interface Props {
  current: ModuleId;
  onSwitch: (id: ModuleId) => void;
}

export default function StepNav({ current, onSwitch }: Props) {
  return (
    <div style={{
      background: 'var(--white)', borderBottom: '1px solid var(--faint)',
      padding: '0 28px', display: 'flex', gap: 0, overflowX: 'auto',
    }}>
      {TABS.map((tab) => {
        const active = current === tab.id;
        return (
          <div
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            style={{
              padding: '14px 22px', fontSize: '13px',
              color: active ? 'var(--g1)' : 'var(--soft)',
              cursor: 'pointer',
              borderBottom: active ? '3px solid var(--g1)' : '3px solid transparent',
              fontWeight: active ? 700 : 400,
              display: 'flex', alignItems: 'center', gap: '7px',
              whiteSpace: 'nowrap', transition: 'all .2s',
            }}
          >
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: active ? 'var(--g1)' : 'var(--faint)',
              color: active ? '#fff' : 'var(--mid)',
              fontSize: '11px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{tab.num}</span>
            {tab.label}
          </div>
        );
      })}
    </div>
  );
}
