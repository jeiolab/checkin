import { format } from 'date-fns';
import type { User, UserRole, Permission } from '../types';
import { userStorage, currentUserStorage } from './storage';
import { hashPassword, verifyPassword, verifyPasswordSync, isEncrypted } from './security';

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
  try {
    // 입력값 검증
    const trimmedIdentifier = emailOrName.trim();
    if (!trimmedIdentifier || !password) {
      console.log('[LOGIN] 입력값 누락:', { identifier: !!trimmedIdentifier, password: !!password });
      return null;
    }
    
    // 사용자 목록 로드
    const users = await userStorage.load();
    console.log('[LOGIN] 로드된 사용자 수:', users.length);
    
    if (users.length === 0) {
      console.log('[LOGIN] 사용자 없음');
      return null;
    }
    
    // 사용자 찾기 (이메일 또는 이름으로) - 대소문자 구분 없이 비교
    const normalizedInput = trimmedIdentifier.toLowerCase();
    const user = users.find(u => {
      // 이메일로 찾기
      if (u.email) {
        const normalizedEmail = u.email.trim().toLowerCase();
        if (normalizedEmail === normalizedInput) {
          console.log('[LOGIN] 이메일로 사용자 찾음:', u.email);
          return true;
        }
      }
      
      // 이름으로 찾기
      const normalizedName = u.name.trim().toLowerCase();
      if (normalizedName === normalizedInput) {
        console.log('[LOGIN] 이름으로 사용자 찾음:', u.name);
        return true;
      }
      
      return false;
    });

    if (!user) {
      console.log('[LOGIN] 사용자를 찾을 수 없음:', trimmedIdentifier);
      console.log('[LOGIN] 등록된 사용자:', users.map(u => ({ name: u.name, email: u.email })));
      return null;
    }

    console.log('[LOGIN] 사용자 발견:', { id: user.id, name: user.name, email: user.email });
    console.log('[LOGIN] 비밀번호 해시 존재:', !!user.password);
    console.log('[LOGIN] 비밀번호 해시 형식:', user.password ? user.password.substring(0, 30) : '없음');
    
    // 비밀번호 검증
    if (!user.password) {
      console.log('[LOGIN] 비밀번호가 없음');
      return null;
    }
    
    let passwordValid = false;
    
    // 해시 형식에 따라 검증
    if (user.password.startsWith('pbkdf2_sha256_100000_')) {
      console.log('[LOGIN] 새로운 해시 형식으로 검증 시도');
      try {
        passwordValid = await verifyPassword(password, user.password);
        console.log('[LOGIN] 비밀번호 검증 결과:', passwordValid);
      } catch (error) {
        console.error('[LOGIN] 비밀번호 검증 오류:', error);
        passwordValid = false;
      }
    } else if (user.password.startsWith('pbkdf2_sha256_10000_')) {
      console.log('[LOGIN] 이전 해시 형식으로 검증 시도');
      try {
        passwordValid = await verifyPassword(password, user.password);
        console.log('[LOGIN] 비밀번호 검증 결과:', passwordValid);
      } catch (error) {
        console.error('[LOGIN] 비밀번호 검증 오류:', error);
        passwordValid = false;
      }
    } else if (user.password.startsWith('hash_')) {
      console.log('[LOGIN] 동기식 해시 형식으로 검증 시도');
      passwordValid = verifyPasswordSync(password, user.password);
      console.log('[LOGIN] 비밀번호 검증 결과:', passwordValid);
    } else {
      // 평문 비밀번호 (마이그레이션 필요)
      console.log('[LOGIN] 평문 비밀번호로 검증 시도');
      passwordValid = user.password === password;
      console.log('[LOGIN] 비밀번호 검증 결과:', passwordValid);
      
      if (passwordValid) {
        // 즉시 해시로 변환
        console.log('[LOGIN] 평문 비밀번호를 해시로 변환');
        user.password = await hashPassword(user.password);
        await userStorage.save(users);
      }
    }
    
    if (!passwordValid) {
      console.log('[LOGIN] 비밀번호 검증 실패');
      return null;
    }
    
    console.log('[LOGIN] 로그인 성공');
    
    // 마지막 로그인 시간 업데이트
    user.lastLogin = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    await userStorage.save(users);
    
    // 민감 정보 제거 후 저장
    const safeUser = { ...user };
    delete (safeUser as any).password;
    await currentUserStorage.save(safeUser);
    
    return user;
  } catch (error) {
    console.error('[LOGIN] 로그인 중 오류:', error);
    return null;
  }
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

