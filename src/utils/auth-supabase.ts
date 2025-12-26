import { supabase, type UserMetadata } from './supabase';
import type { User, UserRole, Permission } from '../types';
import { format } from 'date-fns';

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
 * Supabase 사용자를 앱 User 타입으로 변환
 */
const convertSupabaseUser = (supabaseUser: any, metadata?: UserMetadata): User | null => {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    name: metadata?.name || supabaseUser.email?.split('@')[0] || '사용자',
    email: supabaseUser.email,
    role: (metadata?.role || 'teacher') as UserRole,
    grade: metadata?.grade as Grade | undefined,
    class: metadata?.class as Class | undefined,
    subject: metadata?.subject,
    studentId: metadata?.studentId,
    createdAt: supabaseUser.created_at || format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    lastLogin: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
};

// Grade, Class 타입 정의
type Grade = 1 | 2 | 3;
type Class = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * 사용자 로그인 (Supabase Auth)
 */
export const login = async (emailOrName: string, password: string): Promise<User | null> => {
  try {
    console.log('[SUPABASE LOGIN] 로그인 시도:', { emailOrName });

    // 이메일 형식인지 확인
    const isEmail = emailOrName.includes('@');
    
    let email = emailOrName;
    
    // 이메일이 아니면 이름으로 사용자를 찾아야 함
    // Supabase는 이메일로만 로그인 가능하므로, 이름으로 로그인하려면
    // 먼저 사용자 메타데이터에서 이름으로 이메일을 찾아야 함
    if (!isEmail) {
      console.log('[SUPABASE LOGIN] 이름으로 로그인 시도, 프로필에서 이메일 찾기:', emailOrName);
      
      // 이름으로 사용자 찾기 (Supabase에서 사용자 메타데이터 조회)
      // RLS 정책 때문에 로그인 전에는 조회가 안 될 수 있으므로, 
      // 먼저 시도하고 실패하면 이메일 형식으로 변환 시도
      const { data: profile, error: searchError } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('name', emailOrName)
        .maybeSingle();

      if (searchError) {
        console.error('[SUPABASE LOGIN] 프로필 조회 오류:', searchError);
        // RLS 정책 때문에 조회가 안 될 수 있음 - 이메일 형식으로 변환 시도
        console.log('[SUPABASE LOGIN] RLS 정책 때문에 조회 실패, 이메일 형식으로 변환 시도');
        // 이름을 이메일로 변환 (예: "홍길동" -> "홍길동@example.com"은 작동하지 않으므로 null 반환)
        console.log('[SUPABASE LOGIN] 이름으로는 로그인할 수 없습니다. 이메일을 사용하세요.');
        return null;
      }

      if (!profile || !profile.email) {
        console.log('[SUPABASE LOGIN] 이름으로 사용자를 찾을 수 없음:', emailOrName);
        console.log('[SUPABASE LOGIN] 이메일 주소로 로그인하세요.');
        return null;
      }

      email = profile.email;
      console.log('[SUPABASE LOGIN] 이름으로 이메일 찾음:', email);
    }

    // Supabase Auth로 로그인
    console.log('[SUPABASE LOGIN] Supabase Auth 로그인 시도:', { email: email.trim(), passwordLength: password.length });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.error('[SUPABASE LOGIN] 로그인 오류:', error);
      console.error('[SUPABASE LOGIN] 오류 코드:', error.status);
      console.error('[SUPABASE LOGIN] 오류 메시지:', error.message);
      
      // 더 자세한 오류 정보 제공
      if (error.message.includes('Invalid login credentials')) {
        console.error('[SUPABASE LOGIN] 이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (error.message.includes('Email not confirmed')) {
        console.error('[SUPABASE LOGIN] 이메일 인증이 완료되지 않았습니다.');
      }
      
      return null;
    }

    if (!data.user) {
      console.log('[SUPABASE LOGIN] 사용자 데이터 없음');
      return null;
    }

    console.log('[SUPABASE LOGIN] 로그인 성공:', data.user.email);

    // 프로필이 있는지 확인하고 없으면 생성
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      console.log('[SUPABASE LOGIN] 프로필이 없어서 자동 생성:', data.user.id);
      
      // 기존 사용자 메타데이터에서 정보 추출
      const userMetadata = data.user.user_metadata || {};
      const name = userMetadata.name || data.user.email?.split('@')[0] || '사용자';
      const role = (userMetadata.role || 'teacher') as UserRole;
      
      // 프로필 생성 시도
      const { error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          name: name,
          email: data.user.email || '',
          role: role,
          grade: userMetadata.grade || null,
          class: userMetadata.class || null,
          subject: userMetadata.subject || null,
          student_id: userMetadata.studentId || null,
        });

      if (createError) {
        console.error('[SUPABASE LOGIN] 프로필 자동 생성 오류:', createError);
        // 프로필 생성 실패해도 로그인은 계속 진행
      } else {
        console.log('[SUPABASE LOGIN] 프로필 자동 생성 성공');
      }
    }

    // 사용자 메타데이터 가져오기
    const metadata = data.user.user_metadata as UserMetadata;
    const user = convertSupabaseUser(data.user, metadata);

    if (!user) {
      console.log('[SUPABASE LOGIN] 사용자 변환 실패');
      return null;
    }

    // 세션 저장 (Supabase가 자동으로 처리)
    return user;
  } catch (error) {
    console.error('[SUPABASE LOGIN] 예외 발생:', error);
    return null;
  }
};

/**
 * 사용자 로그아웃 (Supabase Auth)
 */
export const logout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[SUPABASE LOGOUT] 로그아웃 오류:', error);
    }
  } catch (error) {
    console.error('[SUPABASE LOGOUT] 예외 발생:', error);
  }
};

/**
 * 현재 로그인한 사용자 가져오기 (Supabase Auth)
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // 사용자 프로필 가져오기 (user_profiles 테이블에서)
    console.log('[SUPABASE] 사용자 프로필 조회 시작:', { userId: user.id, email: user.email });
    
    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('[SUPABASE] 프로필 조회 결과:', { 
      profile: profile, 
      error: profileError,
      hasProfile: !!profile,
      profileRole: profile?.role 
    });

    // 프로필이 없으면 기존 사용자 정보로 자동 생성
    if (profileError || !profile) {
      console.log('[SUPABASE] 프로필이 없어서 자동 생성 시도:', user.id);
      
      // 기존 사용자 메타데이터에서 정보 추출
      const userMetadata = user.user_metadata || {};
      const name = userMetadata.name || user.email?.split('@')[0] || '사용자';
      const role = (userMetadata.role || 'teacher') as UserRole;
      
      // 프로필 생성 시도
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          name: name,
          email: user.email || '',
          role: role,
          grade: userMetadata.grade || null,
          class: userMetadata.class || null,
          subject: userMetadata.subject || null,
          student_id: userMetadata.studentId || null,
        })
        .select()
        .single();

      if (createError) {
        console.error('[SUPABASE] 프로필 자동 생성 오류:', createError);
        // 프로필 생성 실패해도 기본 정보로 사용자 생성
        profile = null;
      } else {
        profile = newProfile;
        console.log('[SUPABASE] 프로필 자동 생성 성공:', profile);
      }
    }

    // 사용자 메타데이터와 프로필 결합
    // 프로필이 있으면 프로필의 role을 우선 사용 (Supabase 테이블이 최신 정보)
    const metadata: UserMetadata = {
      name: profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || '사용자',
      role: (profile?.role || user.user_metadata?.role || 'teacher') as UserRole, // 프로필의 role 우선
      grade: (profile?.grade || user.user_metadata?.grade) as Grade | undefined,
      class: (profile?.class || user.user_metadata?.class) as Class | undefined,
      subject: profile?.subject || user.user_metadata?.subject,
      studentId: profile?.student_id || user.user_metadata?.studentId,
    };

    console.log('[SUPABASE] 최종 사용자 메타데이터:', metadata);

    const convertedUser = convertSupabaseUser(user, metadata);
    console.log('[SUPABASE] 변환된 사용자:', convertedUser);
    console.log('[SUPABASE] 최종 사용자 역할:', convertedUser?.role);
    
    return convertedUser;
  } catch (error) {
    console.error('[SUPABASE] 현재 사용자 가져오기 오류:', error);
    return null;
  }
};

/**
 * 현재 로그인한 사용자 가져오기 (동기식, 하위 호환성)
 */
export const getCurrentUserSync = (): User | null => {
  // Supabase는 비동기만 지원하므로 null 반환
  return null;
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

