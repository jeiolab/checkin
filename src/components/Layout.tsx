import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Home, BookOpen, Users, BarChart3, Settings, FileText, LogOut, UserCog, ChevronDown } from 'lucide-react';
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin': return '관리자';
      case 'teacher': return '담임 교사';
      case 'subject_teacher': return '교과 교사';
      case 'student_monitor': return '학생 반장';
      default: return role;
    }
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
          <div className="user-info-wrapper" ref={userMenuRef}>
            <button 
              className="user-info-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="사용자 메뉴"
            >
              <div className="user-avatar">
                {currentUser.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-role">{getRoleLabel(currentUser.role)}</span>
              </div>
              <ChevronDown size={16} className={`chevron ${showUserMenu ? 'open' : ''}`} />
            </button>
            {showUserMenu && (
              <div className="user-menu-dropdown">
                <div className="user-menu-header">
                  <div className="user-menu-avatar">
                    {currentUser.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="user-menu-info">
                    <div className="user-menu-name">{currentUser.name}</div>
                    <div className="user-menu-email">{currentUser.email || '이메일 없음'}</div>
                    <div className="user-menu-role-badge">
                      {getRoleLabel(currentUser.role)}
                    </div>
                  </div>
                </div>
                <div className="user-menu-divider"></div>
                <button 
                  className="user-menu-item logout-item"
                  onClick={handleLogout}
                >
                  <LogOut size={18} />
                  <span>로그아웃</span>
                </button>
              </div>
            )}
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
