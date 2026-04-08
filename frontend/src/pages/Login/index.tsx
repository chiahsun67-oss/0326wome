import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { UserInfo } from '../../types';

interface Props {
  onLogin: (user: UserInfo) => void;
  onForgot: () => void;
  initialPassword?: string;
}

export default function Login({ onLogin, onForgot, initialPassword }: Props) {
  const [account, setAccount]   = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (initialPassword) {
      setPassword(initialPassword);
      setShowPwd(true);
    }
  }, [initialPassword]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!account.trim() || !password.trim()) {
      setError('請輸入帳號與密碼');
      return;
    }
    setLoading(true);
    try {
      const res = await api.login(account.trim(), password);
      if (res.success && res.data) {
        onLogin(res.data);
      } else {
        setError(res.error ?? '登入失敗，請確認帳號密碼');
      }
    } catch {
      setError('無法連線至伺服器，請確認後端已啟動');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      {/* ── 左側品牌區 ── */}
      <div className="login-left">
        {/* 背景裝飾 blob */}
        <svg className="blob blob-top" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
          <path fill="rgba(255,255,255,0.18)"
            d="M60,-80C75,-65,82,-42,84,-20C86,3,82,25,72,45C62,65,46,82,25,88C5,95,-20,91,-42,80C-64,69,-84,51,-90,29C-96,7,-88,-19,-74,-40C-60,-61,-40,-77,-18,-82C4,-87,45,-95,60,-80Z"
            transform="translate(260 60)" />
        </svg>
        <svg className="blob blob-bot" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
          <path fill="rgba(255,255,255,0.13)"
            d="M50,-68C63,-55,70,-37,74,-18C78,1,78,21,70,38C62,55,46,68,27,75C8,82,-13,82,-33,74C-53,66,-71,50,-78,30C-85,10,-80,-14,-68,-34C-56,-54,-37,-70,-16,-74C5,-78,37,-81,50,-68Z"
            transform="translate(40 320)" />
        </svg>

        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">W</div>
        </div>

        {/* 主標語 */}
        <div className="login-brand">
          <h1 className="login-brand-title">歡迎使用<br />WMSM 麥頭印標系統</h1>
          <p className="login-brand-sub">
            倉儲進貨標籤套印管理系統<br />
            支援手動套印與 Excel 批次匯入
          </p>
        </div>

        {/* 圓形功能圖示 */}
        <div className="login-icons">
          <div className="login-icon-circle">
            <span>📦</span>
            <div className="login-icon-label">進貨套印</div>
          </div>
          <div className="login-icon-circle login-icon-main">
            <span>🏷</span>
            <div className="login-icon-label">麥頭標籤</div>
          </div>
          <div className="login-icon-circle">
            <span>📊</span>
            <div className="login-icon-label">列印歷史</div>
          </div>
        </div>

        {/* 指示點 */}
        <div className="login-dots">
          <span className="login-dot active" />
          <span className="login-dot" />
          <span className="login-dot" />
        </div>
      </div>

      {/* ── 右側登入表單 ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          <h2 className="login-title">登入系統</h2>
          <p className="login-subtitle">
            尚未有帳號？請聯絡系統管理員
          </p>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="login-field">
              <label className="login-label">帳號</label>
              <input
                className="login-input"
                type="text"
                placeholder="請輸入帳號"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="login-field">
              <label className="login-label">密碼</label>
              <div className="login-pwd-wrap">
                <input
                  className="login-input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="請輸入密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPwd(!showPwd)}
                  tabIndex={-1}
                >
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? '驗證中…' : '登　入'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '12px', color: '#aaa' }}>尚未有帳號？請聯絡系統管理員</span>
            <button
              type="button"
              onClick={onForgot}
              style={{ background: 'none', border: 'none', color: 'var(--g2)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              忘記密碼？
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
