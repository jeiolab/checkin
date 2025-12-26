import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';
import { login } from '../utils/auth-supabase';
import './Login.css';

export default function Login() {
  const [identifier, setIdentifier] = useState<string>(''); // 이름 또는 이메일
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!identifier.trim()) {
      setError('이름 또는 이메일을 입력해주세요.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      console.log('[LOGIN PAGE] 로그인 시도:', { identifier: identifier.trim(), passwordLength: password.length });
      
      // identifier는 sanitize하지만 password는 원본 그대로 전달 (특수문자 포함)
      const loginResult = await login(identifier.trim(), password);
      
      if (loginResult) {
        console.log('[LOGIN PAGE] 로그인 성공:', loginResult.name);
        navigate('/');
        // 약간의 지연 후 새로고침 (상태 업데이트를 위해)
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        console.log('[LOGIN PAGE] 로그인 실패');
        setError('이름(또는 이메일) 또는 비밀번호가 올바르지 않습니다. 브라우저 콘솔을 확인하세요.');
        setPassword(''); // 보안을 위해 비밀번호 필드 초기화
      }
    } catch (err) {
      console.error('[LOGIN PAGE] 로그인 오류:', err);
      
      // 네트워크 오류인 경우 더 명확한 메시지 표시
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('ERR_NAME_NOT_RESOLVED')) {
          errorMessage = 'Supabase 서버에 연결할 수 없습니다. 프로젝트가 일시 중지되었거나 네트워크 문제가 있을 수 있습니다. Supabase 대시보드에서 프로젝트 상태를 확인하세요.';
        } else {
          errorMessage = `로그인 중 오류가 발생했습니다: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Lock size={48} />
          </div>
          <h1>능주고등학교</h1>
          <h2>출석 관리 시스템</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="identifier">
              <User size={18} />
              <span>이름 또는 이메일</span>
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="login-input"
              placeholder="이름 또는 이메일을 입력하세요"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} />
              <span>비밀번호</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            <LogIn size={20} />
            <span>{loading ? '로그인 중...' : '로그인'}</span>
          </button>
        </form>

        <div className="login-footer">
          <p>💡 이름 또는 이메일과 비밀번호를 입력하여 로그인하세요.</p>
          <p>계정이 없으신가요? 관리자에게 문의하세요.</p>
        </div>
      </div>
    </div>
  );
}

