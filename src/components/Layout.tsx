import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Home, BookOpen, Users, BarChart3, Settings, FileText, LogOut, User as UserIcon, UserCog } from 'lucide-react';
import { getCurrentUser, logout, hasPermission } from '../utils/auth-supabase';
import type { Permission, User } from '../types';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      console.log('[LAYOUT] 현재 사용자:', user);
      console.log('[LAYOUT] 사용자 역할:', user?.role);
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Home, label: '대시보드', permission: 'view_all' as Permission, adminOnly: false },
    { path: '/attendance', icon: BookOpen, label: '출석부', permission: 'view_all' as Permission, adminOnly: false },
    { path: '/students', icon: Users, label: '학생 관리', permission: 'edit_students' as Permission, adminOnly: false },
    { path: '/stats', icon: BarChart3, label: '출석 통계', permission: 'view_all' as Permission, adminOnly: false },
    { path: '/report', icon: FileText, label: '주간 리포트', permission: 'view_reports' as Permission, adminOnly: false },
    { path: '/settings', icon: Settings, label: '설정', permission: 'edit_settings' as Permission, adminOnly: false },
    { path: '/users', icon: UserCog, label: '사용자 관리', permission: 'edit_settings' as Permission, adminOnly: true },
  ].filter(item => {
    if (!hasPermission(currentUser, item.permission)) return false;
    if (item.adminOnly && currentUser?.role !== 'admin') return false;
    return true;
  });

  return (
    <div className="layout">
      <header className="header">
        <h1>능주고등학교 출석 관리 시스템</h1>
        {currentUser && (
          <div className="user-info">
            <UserIcon size={18} />
            <span>{currentUser.name}</span>
            <span className="user-role">({currentUser.role === 'admin' ? '관리자' : currentUser.role === 'teacher' ? '담임' : currentUser.role === 'subject_teacher' ? '교과 교사' : '반장'})</span>
            <button onClick={handleLogout} className="logout-btn" title="로그아웃">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </header>
      <nav className="nav">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`nav-item ${location.pathname === path ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <main className="main">
        {children}
      </main>
    </div>
  );
}
