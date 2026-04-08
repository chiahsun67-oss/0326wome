import { useState } from 'react';
import { api } from '../../api/client';

interface Props {
  onBack: (newPassword: string) => void;
}

export default function ForgotPassword({ onBack }: Props) {
  const [step, setStep]           = useState<'form' | 'done'>('form');
  const [username, setUsername]   = useState('');
  const [newPwd, setNewPwd]       = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [hash, setHash]           = useState('');
  const [copied, setCopied]       = useState<'pwd' | 'hash' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim())        { setError('請輸入帳號'); return; }
    if (newPwd.length < 6)       { setError('密碼至少需要 6 個字元'); return; }
    if (newPwd !== confirmPwd)   { setError('兩次密碼輸入不一致'); return; }
    setLoading(true);
    try {
      const res = await api.resetPassword(username.trim(), newPwd);
      if (res.success && res.data) {
        setHash(res.data.hash);
        setStep('done');
      } else {
        setError(res.error ?? '重設密碼失敗，請稍後再試');
      }
    } catch {
      setError('無法連線至伺服器，請確認後端已啟動');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, type: 'pwd' | 'hash') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="login-wrap">
      {/* ── 左側品牌區（沿用 Login 樣式） ── */}
      <div className="login-left">
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
        <div className="login-logo">
          <div className="login-logo-icon">W</div>
        </div>
        <div className="login-brand">
          <h1 className="login-brand-title">重設密碼</h1>
          <p className="login-brand-sub">
            輸入帳號與新密碼<br />
            系統將更新並提供雜湊值供複製
          </p>
        </div>
        <div className="login-icons">
          <div className="login-icon-circle">
            <span>🔐</span>
            <div className="login-icon-label">密碼重設</div>
          </div>
          <div className="login-icon-circle login-icon-main">
            <span>🔑</span>
            <div className="login-icon-label">安全驗證</div>
          </div>
          <div className="login-icon-circle">
            <span>📋</span>
            <div className="login-icon-label">一鍵複製</div>
          </div>
        </div>
      </div>

      {/* ── 右側表單 ── */}
      <div className="login-right">
        <div className="login-form-wrap" style={{ maxWidth: '420px' }}>

          {step === 'form' && (
            <>
              <h2 className="login-title">忘記密碼</h2>
              <p className="login-subtitle">輸入帳號與新密碼，系統將立即更新</p>

              <form onSubmit={handleSubmit} autoComplete="off">
                {/* 帳號 */}
                <div className="login-field">
                  <label className="login-label">帳號</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="請輸入帳號"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* 新密碼 */}
                <div className="login-field">
                  <label className="login-label">新密碼 <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 400 }}>（至少 6 個字元）</span></label>
                  <div className="login-pwd-wrap">
                    <input
                      className="login-input"
                      type={showPwd ? 'text' : 'password'}
                      placeholder="請輸入新密碼"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                    />
                    <button type="button" className="login-eye" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>
                      {showPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                {/* 確認新密碼 */}
                <div className="login-field">
                  <label className="login-label">確認新密碼</label>
                  <div className="login-pwd-wrap">
                    <input
                      className="login-input"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="再次輸入新密碼"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                    />
                    <button type="button" className="login-eye" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                      {showConfirm ? '🙈' : '👁'}
                    </button>
                  </div>
                  {/* 密碼一致提示 */}
                  {confirmPwd && (
                    <div style={{ fontSize: '11px', marginTop: '4px', color: newPwd === confirmPwd ? '#16a34a' : '#dc2626' }}>
                      {newPwd === confirmPwd ? '✓ 密碼一致' : '✗ 密碼不一致'}
                    </div>
                  )}
                </div>

                {error && <div className="login-error">{error}</div>}

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? '更新中…' : '🔐 更新密碼'}
                </button>
              </form>

              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '12px', marginTop: '20px', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center' }}
                onClick={() => onBack('')}
              >
                ← 返回登入
              </button>
            </>
          )}

          {step === 'done' && (
            <>
              {/* 成功標題 */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
                <h2 className="login-title" style={{ marginBottom: '6px' }}>密碼更新成功</h2>
                <p className="login-subtitle">帳號 <strong style={{ color: 'var(--g1)' }}>{username}</strong> 的密碼已更新</p>
              </div>

              {/* 新密碼（純文字，供複製後返回貼上） */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--mid)', marginBottom: '6px' }}>
                  🔑 新密碼（複製後可返回登入頁貼上）
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    readOnly
                    type="text"
                    value={newPwd}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: '8px',
                      border: '1.5px solid var(--g2)', background: 'var(--g4)',
                      fontSize: '15px', fontWeight: 700, color: 'var(--g1)',
                      fontFamily: 'monospace', letterSpacing: '2px',
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => copyText(newPwd, 'pwd')}
                    style={{ whiteSpace: 'nowrap', minWidth: '72px' }}
                  >
                    {copied === 'pwd' ? '✓ 已複製' : '📋 複製'}
                  </button>
                </div>
              </div>

              {/* bcrypt 雜湊值 */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--mid)', marginBottom: '6px' }}>
                  🔒 資料庫雜湊值（bcrypt，供管理員確認）
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <textarea
                    readOnly
                    value={hash}
                    rows={2}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px',
                      border: '1.5px solid var(--faint)', background: '#f8f8f8',
                      fontSize: '11px', fontFamily: 'monospace', color: '#666',
                      resize: 'none', wordBreak: 'break-all',
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyText(hash, 'hash')}
                    style={{ whiteSpace: 'nowrap', minWidth: '72px' }}
                  >
                    {copied === 'hash' ? '✓ 已複製' : '📋 複製'}
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                  此雜湊值已儲存至資料庫，無須手動操作
                </div>
              </div>

              {/* 返回登入（帶入新密碼） */}
              <button
                type="button"
                className="login-btn"
                onClick={() => onBack(newPwd)}
              >
                ← 返回登入並自動填入密碼
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
