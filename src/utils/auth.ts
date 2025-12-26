import { format } from 'date-fns';
import type { User, UserRole, Permission } from '../types';
import { userStorage, currentUserStorage } from './storage';
import { hashPassword, verifyPassword, verifyPasswordSync, sanitizeInput, isEncrypted } from './security';

/**
 * 역할별 권한 매핑
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_all',
    'edit_all',
    'edit_attendance',
    'edit_students',
    'edit_settings',
    'approve_attendance',
    'view_reports',
  ],
  teacher: [
    'view_all',
    'edit_all',
    'edit_attendance',
    'edit_students',
    'edit_settings',
    'approve_attendance',
    'view_reports',
  ],
  subject_teacher: [
    'view_all',
    'edit_attendance',
    'check_attendance',
    'view_reports',
  ],
  student_monitor: [
    'check_attendance',
  ],
};

/**
 * 사용자 로그인
 */
export const login = async (emailOrName: string, password: string): Promise<User | null> => {
  // 입력값 정제 (비밀번호는 sanitizeInput 사용하지 않음 - 특수문자 포함 가능)
  const sanitizedEmailOrName = sanitizeInput(emailOrName.trim());
  
  if (!sanitizedEmailOrName || !password) {
    return null;
  }
  
  const users = await userStorage.load();
  
  // 사용자 찾기 (이메일 또는 이름으로) - 대소문자 구분 없이 비교
  const user = users.find(u => {
    // 이메일로 찾기
    if (u.email) {
      const userEmail = u.email.trim().toLowerCase();
      const inputEmail = emailOrName.trim().toLowerCase();
      const sanitizedUserEmail = sanitizeInput(u.email.trim()).toLowerCase();
      const sanitizedInputEmail = sanitizedEmailOrName.toLowerCase();
      
      if (userEmail === inputEmail || sanitizedUserEmail === sanitizedInputEmail) {
        return true;
      }
    }
    
    // 이름으로 찾기
    const userName = u.name.trim().toLowerCase();
    const inputName = emailOrName.trim().toLowerCase();
    const sanitizedUserName = sanitizeInput(u.name.trim()).toLowerCase();
    const sanitizedInputName = sanitizedEmailOrName.toLowerCase();
    
    return userName === inputName || sanitizedUserName === sanitizedInputName;
  });

  if (user) {
    // 비밀번호 검증 (비동기) - 원본 비밀번호 사용
    let passwordValid = false;
    if (user.password) {
      if (user.password.startsWith('pbkdf2_sha256_10000_') || user.password.startsWith('pbkdf2_sha256_100000_')) {
        // 새로운 해시 형식
        passwordValid = await verifyPassword(password, user.password);
      } else if (user.password.startsWith('hash_')) {
        // 기존 해시 형식 (하위 호환성)
        passwordValid = verifyPasswordSync(password, user.password);
      } else {
        // 평문 비밀번호 (마이그레이션 필요)
        passwordValid = user.password === password;
        // 즉시 해시로 변환
        user.password = await hashPassword(user.password);
        await userStorage.save(users);
      }
    }
    
    if (!passwordValid) {
      return null;
    }
    
    // 비밀번호가 평문이면 해시로 변환 (이미 위에서 처리됨)
    
    user.lastLogin = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    await userStorage.save(users);
    
    // 민감 정보 제거 후 저장
    const safeUser = { ...user };
    delete (safeUser as any).password;
    await currentUserStorage.save(safeUser);
    
    return user;
  }

  return null;
};

/**
 * 사용자 로그아웃
 */
export const logout = async (): Promise<void> => {
  await currentUserStorage.save(null);
};

/**
 * 현재 로그인한 사용자 가져오기
 */
export const getCurrentUser = async (): Promise<User | null> => {
  return await currentUserStorage.load();
};

/**
 * 현재 로그인한 사용자 가져오기 (동기식, 하위 호환성)
 */
export const getCurrentUserSync = (): User | null => {
  try {
    const data = localStorage.getItem('neungju_current_user');
    if (!data) return null;
    
    // 암호화된 데이터는 null 반환 (비동기 로드 필요)
    if (isEncrypted(data)) {
      return null;
    }
    
    return JSON.parse(data);
  } catch {
    return null;
  }
};

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 */
export const hasPermission = (user: User | null, permission: Permission): boolean => {
  if (!user) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
};

/**
 * 사용자가 여러 권한 중 하나라도 가지고 있는지 확인
 */
export const hasAnyPermission = (user: User | null, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * 사용자가 모든 권한을 가지고 있는지 확인
 */
export const hasAllPermissions = (user: User | null, permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * 사용자가 특정 학년/반에 접근할 수 있는지 확인
 */
export const canAccessClass = (user: User | null, grade: number, classNum: number): boolean => {
  if (!user) return false;

  // 관리자와 담임 교사는 모든 반 접근 가능
  if (user.role === 'admin' || user.role === 'teacher') {
    // 담임 교사는 자신의 반만 접근 가능
    if (user.role === 'teacher' && user.grade && user.class) {
      return user.grade === grade && user.class === classNum;
    }
    return true;
  }

  // 교과 교사와 학생 반장은 제한적 접근
  return false;
};

/**
 * 사용자가 출석을 수정할 수 있는지 확인
 */
export const canEditAttendance = (user: User | null): boolean => {
  return hasAnyPermission(user, ['edit_attendance', 'edit_all']);
};

/**
 * 사용자가 학생 정보를 수정할 수 있는지 확인
 */
export const canEditStudents = (user: User | null): boolean => {
  return hasAnyPermission(user, ['edit_students', 'edit_all']);
};

/**
 * 사용자가 설정을 수정할 수 있는지 확인
 */
export const canEditSettings = (user: User | null): boolean => {
  return hasAnyPermission(user, ['edit_settings', 'edit_all']);
};

/**
 * 사용자가 출석을 승인할 수 있는지 확인
 */
export const canApproveAttendance = (user: User | null): boolean => {
  return hasPermission(user, 'approve_attendance');
};

