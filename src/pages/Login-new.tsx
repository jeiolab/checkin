import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';
import { login } from '../utils/auth-supabase-new';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('📝 [LOGIN PAGE] 폼 제출');

    // 입력값 검증
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해주세요.');
      setLoading(false);
      return;
    }

    // 이메일 형식 검증
    if (!email.includes('@')) {
      setError('올바른 이메일 형식을 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      console.log('🚀 [LOGIN PAGE] 로그인 함수 호출');
      const result = await login(email.trim(), password);
      
      console.log('📊 [LOGIN PAGE] 로그인 결과:', result);

      if (result.success && result.user) {
        console.log('✅ [LOGIN PAGE] 로그인 성공, 페이지 이동');
        navigate('/');
        // 상태 업데이트를 위해 약간의 지연 후 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        console.error('❌ [LOGIN PAGE] 로그인 실패:', result.error);
        setError(result.error || '로그인에 실패했습니다. 브라우저 콘솔(F12)을 확인하세요.');
        setPassword(''); // 보안을 위해 비밀번호 필드 초기화
      }
    } catch (err) {
      console.error('❌ [LOGIN PAGE] 예외 발생:', err);
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = `로그인 오류: ${err.message}`;
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
            <label htmlFor="email">
              <User size={18} />
              <span>이메일</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              placeholder="이메일을 입력하세요"
              required
              autoFocus
              autoComplete="email"
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

          {error && (
            <div className="error-message" style={{ 
              padding: '12px', 
              backgroundColor: '#fee', 
              color: '#c33', 
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            <LogIn size={20} />
            <span>{loading ? '로그인 중...' : '로그인'}</span>
          </button>
        </form>

        <div className="login-footer">
          <p>💡 이메일과 비밀번호를 입력하여 로그인하세요.</p>
          <p>계정이 없으신가요? 관리자에게 문의하세요.</p>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
            🔍 문제가 있으면 브라우저 콘솔(F12)을 확인하세요.
          </p>
        </div>
      </div>
    </div>
  );
}

