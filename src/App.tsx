import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense, useCallback } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import { initializeSampleData } from './utils/storage';
import { getCurrentUser } from './utils/auth-supabase';
import type { User } from './types';
import './App.css';
import './styles/mobile.css';

// 코드 스플리팅: 페이지별 lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AttendanceBook = lazy(() => import('./pages/AttendanceBook'));
const StudentManagement = lazy(() => import('./pages/StudentManagement'));
const AttendanceStats = lazy(() => import('./pages/AttendanceStats'));
const Settings = lazy(() => import('./pages/Settings'));
const WeeklyReport = lazy(() => import('./pages/WeeklyReport'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

// 로딩 컴포넌트
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '1.2rem',
    color: '#667eea'
  }}>
    로딩 중...
  </div>
);

// 보호된 라우트 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setLoading(false);
    };
    loadUser();
  }, []);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 권한 체크는 각 페이지에서 수행
  return <>{children}</>;
}

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeSampleData();
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('초기화 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    init();

    // PWA 설치 프롬프트 처리
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#667eea'
      }}>
        로딩 중...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            currentUser ? (
              <Layout>
                {showInstallPrompt && (
                  <div className="install-prompt">
                    <div className="install-prompt-content">
                      <p>홈 화면에 추가하여 앱처럼 사용하세요!</p>
                      <div className="install-prompt-actions">
                        <button onClick={handleInstallClick} className="install-btn">
                          설치하기
                        </button>
                        <button onClick={() => setShowInstallPrompt(false)} className="install-close">
                          닫기
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/attendance" element={<ProtectedRoute><AttendanceBook /></ProtectedRoute>} />
                    <Route path="/students" element={<ProtectedRoute><StudentManagement /></ProtectedRoute>} />
                    <Route path="/stats" element={<ProtectedRoute><AttendanceStats /></ProtectedRoute>} />
                    <Route path="/report" element={<ProtectedRoute><WeeklyReport /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                    <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                  </Routes>
                </Suspense>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

