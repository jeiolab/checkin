import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { getCurrentUser, logout } from '../utils/auth-supabase';
import { changePassword } from '../utils/user-supabase';
import { validatePasswordStrength } from '../utils/security';
import { supabase } from '../utils/supabase';
import './ChangePassword.css';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setError('로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        setLoading(false);
        return;
      }

      // 현재 비밀번호 확인 (Supabase Auth)
      if (!currentUser.email) {
        setError('이메일 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      if (signInError) {
        setError('현재 비밀번호가 올바르지 않습니다.');
        setCurrentPassword('');
        setLoading(false);
        return;
      }

      // 새 비밀번호 검증
      if (!newPassword) {
        setError('새 비밀번호를 입력해주세요.');
        setLoading(false);
        return;
      }

      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        setError(passwordValidation.message);
        setNewPassword('');
        setConfirmPassword('');
        setLoading(false);
        return;
      }

      // 새 비밀번호와 현재 비밀번호가 같은지 확인
      if (newPassword === currentPassword) {
        setError('새 비밀번호는 현재 비밀번호와 다르게 설정해야 합니다.');
        setNewPassword('');
        setConfirmPassword('');
        setLoading(false);
        return;
      }

      // 비밀번호 확인
      if (newPassword !== confirmPassword) {
        setError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
        setConfirmPassword('');
        setLoading(false);
        return;
      }

      // 비밀번호 업데이트 (Supabase Auth)
      const success = await changePassword(newPassword);
      
      if (!success) {
        setError('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      
      // 2초 후 로그아웃하여 다시 로그인하도록 유도
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError('비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <div className="change-password-header">
          <div className="change-password-icon">
            <Lock size={48} />
          </div>
          <h2>비밀번호 변경</h2>
          <p>보안을 위해 정기적으로 비밀번호를 변경하세요.</p>
        </div>

        {success ? (
          <div className="success-message">
            <CheckCircle2 size={24} />
            <p>비밀번호가 성공적으로 변경되었습니다.</p>
            <p>보안을 위해 다시 로그인해주세요.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="change-password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">
                <Lock size={18} />
                <span>현재 비밀번호 *</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="password-input"
                  placeholder="현재 비밀번호를 입력하세요"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">
                <Lock size={18} />
                <span>새 비밀번호 *</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="password-input"
                  placeholder="새 비밀번호 (최소 8자, 영문/숫자/특수문자 중 2가지 이상)"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small>비밀번호는 최소 8자 이상이며, 영문, 숫자, 특수문자 중 최소 2가지 이상을 포함해야 합니다.</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <Lock size={18} />
                <span>새 비밀번호 확인 *</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="password-input"
                  placeholder="새 비밀번호를 다시 입력하세요"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <XCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="cancel-btn"
                disabled={loading}
              >
                취소
              </button>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

