import { useState, useEffect, useMemo } from 'react';
import { Trash2, Edit2, Search, UserPlus, Shield, GraduationCap, BookOpen, Users, Mail, Calendar, Clock, MoreVertical } from 'lucide-react';
import { getAllUsers, createUser, updateUser, deleteUser } from '../utils/user-supabase';
import { getCurrentUser, canEditSettings } from '../utils/auth-supabase';
import { sanitizeInput, validateEmail, validatePasswordStrength, validateUserName } from '../utils/security';
import type { User, UserRole, Grade, Class } from '../types';
import './UserManagement.css';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);
  const canEdit = canEditSettings(currentUser) && currentUser?.role === 'admin';

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.user-menu')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    const allUsers = await getAllUsers();
    setUsers(allUsers);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = user.name.toLowerCase().includes(query);
        const roleMatch = getRoleLabel(user.role).toLowerCase().includes(query);
        if (!nameMatch && !roleMatch) return false;
      }
      if (filterRole !== 'all' && user.role !== filterRole) return false;
      return true;
    });
  }, [users, searchQuery, filterRole]);

  const roleStats = useMemo(() => {
    const stats = {
      admin: 0,
      teacher: 0,
      subject_teacher: 0,
      student_monitor: 0,
    };
    users.forEach(user => {
      if (user.role in stats) {
        stats[user.role as keyof typeof stats]++;
      }
    });
    return stats;
  }, [users]);

  const handleAddUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    if (!canEdit) {
      alert('사용자를 추가할 권한이 없습니다.');
      return;
    }

    // 입력값 검증
    const nameValidation = validateUserName(userData.name);
    if (!nameValidation.valid) {
      alert(nameValidation.message);
      return;
    }

    if (userData.email && !validateEmail(userData.email)) {
      alert('유효한 이메일 주소를 입력해주세요.');
      return;
    }

    if (userData.password) {
      const passwordValidation = validatePasswordStrength(userData.password);
      if (!passwordValidation.valid) {
        alert(passwordValidation.message);
        return;
      }
    }

    // 새 사용자는 비밀번호 필수
    if (!userData.password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    if (!userData.email) {
      alert('이메일을 입력해주세요.');
      return;
    }

    // Supabase로 사용자 생성
    const newUser = await createUser(
      sanitizeInput(userData.email.trim()),
      userData.password,
      {
        name: sanitizeInput(userData.name.trim()),
        role: userData.role,
        grade: userData.grade,
        class: userData.class,
        subject: userData.subject ? sanitizeInput(userData.subject.trim()) : undefined,
        studentId: userData.studentId,
      }
    );

    if (!newUser) {
      alert('사용자 생성에 실패했습니다.');
      return;
    }

    await loadUsers(); // 목록 새로고침
    setShowAddForm(false);
  };

  const handleUpdateUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    if (!canEdit) {
      alert('사용자를 수정할 권한이 없습니다.');
      return;
    }

    if (!editingUser) return;

    // Supabase로 사용자 업데이트
    const success = await updateUser(editingUser.id, {
      name: sanitizeInput(userData.name.trim()),
      role: userData.role,
      grade: userData.grade,
      class: userData.class,
      subject: userData.subject ? sanitizeInput(userData.subject.trim()) : undefined,
      studentId: userData.studentId,
    });

    if (!success) {
      alert('사용자 수정에 실패했습니다.');
      return;
    }

    await loadUsers(); // 목록 새로고침
    setEditingUser(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (!canEdit) {
      alert('사용자를 삭제할 권한이 없습니다.');
      return;
    }

    if (id === currentUser?.id) {
      alert('자신의 계정은 삭제할 수 없습니다.');
      return;
    }

    if (!confirm('이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    // Supabase로 사용자 삭제
    const success = await deleteUser(id);
    
    if (!success) {
      alert('사용자 삭제에 실패했습니다.');
      return;
    }

    await loadUsers(); // 목록 새로고침
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return '관리자';
      case 'teacher': return '담임 교사';
      case 'subject_teacher': return '교과 교사';
      case 'student_monitor': return '학생 반장';
      default: return role;
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield size={16} />;
      case 'teacher': return <GraduationCap size={16} />;
      case 'subject_teacher': return <BookOpen size={16} />;
      case 'student_monitor': return <Users size={16} />;
      default: return null;
    }
  };

  if (!canEdit) {
    return (
      <div className="user-management">
        <div className="access-denied">
          <Shield size={48} />
          <h2>접근 권한이 없습니다</h2>
          <p>사용자 관리 기능은 관리자만 사용할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="header-content">
          <h2>사용자 관리</h2>
          <p className="header-subtitle">시스템 사용자 계정을 관리합니다</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="add-btn">
          <UserPlus size={18} />
          <span>사용자 추가</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-admin">
          <div className="stat-icon">
            <Shield size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{roleStats.admin}</div>
            <div className="stat-label">관리자</div>
          </div>
        </div>
        <div className="stat-card stat-teacher">
          <div className="stat-icon">
            <GraduationCap size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{roleStats.teacher}</div>
            <div className="stat-label">담임 교사</div>
          </div>
        </div>
        <div className="stat-card stat-subject">
          <div className="stat-icon">
            <BookOpen size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{roleStats.subject_teacher}</div>
            <div className="stat-label">교과 교사</div>
          </div>
        </div>
        <div className="stat-card stat-monitor">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{roleStats.student_monitor}</div>
            <div className="stat-label">학생 반장</div>
          </div>
        </div>
        <div className="stat-card stat-total">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">전체 사용자</div>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="이름 또는 역할로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
          className="filter-select"
        >
          <option value="all">전체 역할</option>
          <option value="admin">관리자</option>
          <option value="teacher">담임 교사</option>
          <option value="subject_teacher">교과 교사</option>
          <option value="student_monitor">학생 반장</option>
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>{searchQuery || filterRole !== 'all' ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}</h3>
          <p>{searchQuery || filterRole !== 'all' ? '다른 검색어나 필터를 시도해보세요' : '새 사용자를 추가하여 시작하세요'}</p>
        </div>
      ) : (
        <div className="users-grid">
          {filteredUsers.map(user => (
            <div key={user.id} className={`user-card ${user.id === currentUser?.id ? 'current-user' : ''}`}>
              <div className="user-card-header">
                <div className="user-avatar">
                  {getRoleIcon(user.role)}
                </div>
                <div className="user-info-main">
                  <h3 className="user-name">{user.name}</h3>
                  <span className={`role-badge role-${user.role}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <div className="user-menu">
                  <button
                    className="menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const menu = e.currentTarget.nextElementSibling as HTMLElement;
                      menu?.classList.toggle('active');
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>
                  <div className="dropdown-menu">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
                      }}
                      className="menu-item"
                    >
                      <Edit2 size={16} />
                      <span>수정</span>
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteUser(user.id);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
                      }}
                      className="menu-item delete"
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2 size={16} />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="user-card-body">
                {user.grade && user.class && (
                  <div className="user-detail">
                    <GraduationCap size={16} />
                    <span>{user.grade}학년 {user.class}반</span>
                  </div>
                )}
                {user.subject && (
                  <div className="user-detail">
                    <BookOpen size={16} />
                    <span>{user.subject}</span>
                  </div>
                )}
                {user.email && (
                  <div className="user-detail">
                    <Mail size={16} />
                    <span>{user.email}</span>
                  </div>
                )}
              </div>
              <div className="user-card-footer">
                <div className="user-meta">
                  <div className="meta-item">
                    <Calendar size={14} />
                    <span>{user.createdAt.split(' ')[0]}</span>
                  </div>
                  {user.lastLogin && (
                    <div className="meta-item">
                      <Clock size={14} />
                      <span>{user.lastLogin}</span>
                    </div>
                  )}
                </div>
                {user.id === currentUser?.id && (
                  <span className="current-badge">현재 사용자</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <UserForm
          onSave={handleAddUser}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingUser && (
        <UserForm
          user={editingUser}
          onSave={handleUpdateUser}
          onCancel={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}

// 사용자 추가/수정 폼
interface UserFormProps {
  user?: User;
  onSave: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    role: (user?.role || 'teacher') as UserRole,
    password: '',
    email: user?.email || '',
    grade: user?.grade || undefined as Grade | undefined,
    class: user?.class || undefined as Class | undefined,
    subject: user?.subject || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 입력값 검증
    const nameValidation = validateUserName(formData.name);
    if (!nameValidation.valid) {
      alert(nameValidation.message);
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      alert('유효한 이메일 주소를 입력해주세요.');
      return;
    }

    if (!user && !formData.password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    if (formData.password) {
      const passwordValidation = validatePasswordStrength(formData.password);
      if (!passwordValidation.valid) {
        alert(passwordValidation.message);
        return;
      }
    }

    const userData: Omit<User, 'id' | 'createdAt'> = {
      name: sanitizeInput(formData.name.trim()),
      role: formData.role,
      password: formData.password || undefined, // Supabase에서는 비밀번호를 별도로 관리
      email: formData.email ? sanitizeInput(formData.email.trim()) : undefined,
      grade: formData.grade,
      class: formData.class,
      subject: formData.subject ? sanitizeInput(formData.subject.trim()) : undefined,
      lastLogin: user?.lastLogin,
    };

    await onSave(userData);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{user ? '사용자 수정' : '사용자 추가'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이름 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="사용자 이름"
            />
          </div>

          <div className="form-group">
            <label>역할 *</label>
            <select
              value={formData.role}
              onChange={(e) => {
                const role = e.target.value as UserRole;
                setFormData({ ...formData, role });
                // 역할에 따라 관련 필드 초기화
                if (role !== 'teacher') {
                  setFormData(prev => ({ ...prev, grade: undefined, class: undefined }));
                }
                if (role !== 'subject_teacher') {
                  setFormData(prev => ({ ...prev, subject: '' }));
                }
              }}
              required
            >
              <option value="admin">관리자</option>
              <option value="teacher">담임 교사</option>
              <option value="subject_teacher">교과 교사</option>
              <option value="student_monitor">학생 반장</option>
            </select>
          </div>

          {!user && (
            <div className="form-group">
              <label>비밀번호 *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!user}
                placeholder="비밀번호 (최소 8자, 영문/숫자/특수문자 중 2가지 이상)"
                minLength={8}
              />
              <small>비밀번호는 최소 8자 이상이며, 영문, 숫자, 특수문자 중 최소 2가지 이상을 포함해야 합니다.</small>
            </div>
          )}

          {user && (
            <div className="form-group">
              <label>비밀번호 변경 (선택)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="변경할 비밀번호 (비워두면 기존 비밀번호 유지)"
                minLength={8}
              />
              {formData.password && (
                <small>비밀번호는 최소 8자 이상이며, 영문, 숫자, 특수문자 중 최소 2가지 이상을 포함해야 합니다.</small>
              )}
            </div>
          )}

          <div className="form-group">
            <label>이메일 (선택)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="이메일 주소"
            />
          </div>

          {formData.role === 'teacher' && (
            <>
              <div className="form-group">
                <label>담임 학년 *</label>
                <select
                  value={formData.grade || ''}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value ? Number(e.target.value) as Grade : undefined })}
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="1">1학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                </select>
              </div>
              <div className="form-group">
                <label>담임 반 *</label>
                <select
                  value={formData.class || ''}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value ? Number(e.target.value) as Class : undefined })}
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="1">1반</option>
                  <option value="2">2반</option>
                  <option value="3">3반</option>
                  <option value="4">4반</option>
                  <option value="5">5반</option>
                  <option value="6">6반</option>
                </select>
              </div>
            </>
          )}

          {formData.role === 'subject_teacher' && (
            <div className="form-group">
              <label>담당 과목 *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                placeholder="예: 국어, 수학, 영어"
              />
            </div>
          )}

          {formData.role === 'student_monitor' && (
            <>
              <div className="form-group">
                <label>학년 *</label>
                <select
                  value={formData.grade || ''}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value ? Number(e.target.value) as Grade : undefined })}
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="1">1학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                </select>
              </div>
              <div className="form-group">
                <label>반 *</label>
                <select
                  value={formData.class || ''}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value ? Number(e.target.value) as Class : undefined })}
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="1">1반</option>
                  <option value="2">2반</option>
                  <option value="3">3반</option>
                  <option value="4">4반</option>
                  <option value="5">5반</option>
                  <option value="6">6반</option>
                </select>
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              취소
            </button>
            <button type="submit" className="save-btn">
              {user ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

