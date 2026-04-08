import { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import StepNav from './components/StepNav';
import SideBar from './components/SideBar';
import Toast from './components/Toast';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import WMSM020 from './pages/WMSM020';
import WMSM030 from './pages/WMSM030';
import LabelPreview from './pages/LabelPreview';
import PrintHistory from './pages/PrintHistory';
import UATConfirm from './pages/UATConfirm';
import { ModuleId, UserInfo } from './types';

export default function App() {
  const [user, setUser]           = useState<UserInfo | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'forgot'>('login');
  const [prefillPwd, setPrefillPwd] = useState('');
  const [current, setCurrent]     = useState<ModuleId>('m020');
  const [toast, setToast]         = useState('');

  const showToast = useCallback((msg: string) => setToast(msg), []);

  if (!user) {
    if (authScreen === 'forgot') {
      return (
        <>
          <ForgotPassword
            onBack={(newPwd) => {
              setPrefillPwd(newPwd);
              setAuthScreen('login');
            }}
          />
          <Toast message={toast} onClose={() => setToast('')} />
        </>
      );
    }
    return (
      <>
        <Login
          onLogin={(u) => setUser(u)}
          onForgot={() => setAuthScreen('forgot')}
          initialPassword={prefillPwd}
        />
        <Toast message={toast} onClose={() => setToast('')} />
      </>
    );
  }

  return (
    <>
      <TopBar operator={user.display_name} onLogout={() => setUser(null)} />
      <StepNav current={current} onSwitch={setCurrent} />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 100px)' }}>
        <SideBar current={current} onSwitch={setCurrent} />

        <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxWidth: '1100px' }}>
          {current === 'm020'    && <WMSM020 onToast={showToast} onSwitchHistory={() => setCurrent('history')} operator={user.display_name} />}
          {current === 'm030'    && <WMSM030 onToast={showToast} />}
          {current === 'label'   && <LabelPreview />}
          {current === 'history' && <PrintHistory />}
          {current === 'confirm' && <UATConfirm onToast={showToast} />}
        </div>
      </div>

      {/* 底部導覽列 */}
      <div style={{
        background: 'var(--white)', borderTop: '2px solid var(--g2)',
        padding: '18px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', bottom: 0,
        boxShadow: '0 -2px 12px rgba(0,0,0,.06)',
      }}>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>
          實務確認版 v1.0 &nbsp;|&nbsp; <strong style={{ color: 'var(--g1)' }}>WMSM 麥頭印標系統</strong> &nbsp;|&nbsp; 僅供確認用途
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const modules: ModuleId[] = ['m020','m030','label','history','confirm'];
            const idx = modules.indexOf(current);
            if (idx > 0) setCurrent(modules[idx - 1]);
          }}>‹ 上一頁</button>
          <button className="btn btn-primary btn-sm" onClick={() => {
            const modules: ModuleId[] = ['m020','m030','label','history','confirm'];
            const idx = modules.indexOf(current);
            if (idx < modules.length - 1) setCurrent(modules[idx + 1]);
          }}>下一頁 ›</button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  );
}
