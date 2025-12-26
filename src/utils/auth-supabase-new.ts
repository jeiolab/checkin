import { supabase, type UserMetadata } from './supabase';
import type { User, UserRole } from '../types';
import { format } from 'date-fns';

// Grade, Class 타입 정의
type Grade = 1 | 2 | 3;
type Class = 1 | 2 | 3 | 4 | 5 | 6;

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

/**
 * 간단하고 명확한 로그인 함수
 * 이메일과 비밀번호만 사용 (이름으로 로그인은 제거)
 */
export const login = async (email: string, password: string): Promise<{ success: boolean; user: User | null; error?: string }> => {
  console.log('🔐 [LOGIN] 로그인 시작');
  console.log('📧 [LOGIN] 이메일:', email);
  console.log('🔑 [LOGIN] 비밀번호 길이:', password.length);

  try {
    // 1단계: 입력값 검증
    if (!email || !email.trim()) {
      const error = '이메일을 입력해주세요.';
      console.error('❌ [LOGIN]', error);
      return { success: false, user: null, error };
    }

    if (!password || password.length === 0) {
      const error = '비밀번호를 입력해주세요.';
      console.error('❌ [LOGIN]', error);
      return { success: false, user: null, error };
    }

    // 2단계: 환경 변수 확인
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    console.log('🌐 [LOGIN] Supabase URL:', supabaseUrl ? '설정됨' : '❌ 없음');
    console.log('🔑 [LOGIN] Supabase Key:', supabaseAnonKey ? '설정됨' : '❌ 없음');

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = 'Supabase 설정이 올바르지 않습니다. .env.local 파일을 확인하세요.';
      console.error('❌ [LOGIN]', error);
      return { success: false, user: null, error };
    }

    // 3단계: Supabase Auth로 로그인
    console.log('🚀 [LOGIN] Supabase Auth 로그인 시도...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.error('❌ [LOGIN] 로그인 실패:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });

      let errorMessage = '로그인에 실패했습니다.';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 완료되지 않았습니다. Supabase 대시보드에서 확인하세요.';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도하세요.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '서버에 연결할 수 없습니다. 네트워크 연결을 확인하세요.';
      } else {
        errorMessage = `로그인 오류: ${error.message}`;
      }

      return { success: false, user: null, error: errorMessage };
    }

    if (!data.user) {
      const error = '사용자 데이터를 가져올 수 없습니다.';
      console.error('❌ [LOGIN]', error);
      return { success: false, user: null, error };
    }

    console.log('✅ [LOGIN] Supabase Auth 로그인 성공');
    console.log('👤 [LOGIN] 사용자 ID:', data.user.id);
    console.log('📧 [LOGIN] 사용자 이메일:', data.user.email);

    // 4단계: 프로필 확인 및 생성
    console.log('📋 [LOGIN] 프로필 확인 중...');
    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      console.log('📝 [LOGIN] 프로필이 없어서 자동 생성 시도...');
      
      const userMetadata = data.user.user_metadata || {};
      const name = userMetadata.name || data.user.email?.split('@')[0] || '사용자';
      const role = (userMetadata.role || 'teacher') as UserRole;
      
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
        console.error('⚠️ [LOGIN] 프로필 생성 실패:', createError.message);
        // 프로필 생성 실패해도 로그인은 계속 진행
      } else {
        console.log('✅ [LOGIN] 프로필 자동 생성 성공');
        // 생성된 프로필 다시 가져오기
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        profile = newProfile;
      }
    } else {
      console.log('✅ [LOGIN] 프로필 확인 완료');
    }

    // 5단계: 사용자 객체 생성
    const metadata: UserMetadata = {
      name: profile?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || '사용자',
      role: (profile?.role || data.user.user_metadata?.role || 'teacher') as UserRole,
      grade: (profile?.grade || data.user.user_metadata?.grade) as Grade | undefined,
      class: (profile?.class || data.user.user_metadata?.class) as Class | undefined,
      subject: profile?.subject || data.user.user_metadata?.subject,
      studentId: profile?.student_id || data.user.user_metadata?.studentId,
    };

    const user = convertSupabaseUser(data.user, metadata);
    
    if (!user) {
      const error = '사용자 정보를 변환할 수 없습니다.';
      console.error('❌ [LOGIN]', error);
      return { success: false, user: null, error };
    }

    console.log('✅ [LOGIN] 로그인 완료');
    console.log('👤 [LOGIN] 사용자 이름:', user.name);
    console.log('🎭 [LOGIN] 사용자 역할:', user.role);

    return { success: true, user };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    console.error('❌ [LOGIN] 예외 발생:', errorMessage);
    return { success: false, user: null, error: errorMessage };
  }
};

/**
 * 사용자 로그아웃
 */
export const logout = async (): Promise<void> => {
  try {
    console.log('🚪 [LOGOUT] 로그아웃 시작');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ [LOGOUT] 로그아웃 오류:', error.message);
    } else {
      console.log('✅ [LOGOUT] 로그아웃 완료');
    }
  } catch (error) {
    console.error('❌ [LOGOUT] 예외 발생:', error instanceof Error ? error.message : '알 수 없는 오류');
  }
};

/**
 * 현재 로그인한 사용자 가져오기
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    console.log('👤 [GET_USER] 현재 사용자 조회 시작');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.log('ℹ️ [GET_USER] 로그인된 사용자 없음');
      return null;
    }

    console.log('✅ [GET_USER] 사용자 확인:', user.email);

    // 프로필 가져오기
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const metadata: UserMetadata = {
      name: profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || '사용자',
      role: (profile?.role || user.user_metadata?.role || 'teacher') as UserRole,
      grade: (profile?.grade || user.user_metadata?.grade) as Grade | undefined,
      class: (profile?.class || user.user_metadata?.class) as Class | undefined,
      subject: profile?.subject || user.user_metadata?.subject,
      studentId: profile?.student_id || user.user_metadata?.studentId,
    };

    const convertedUser = convertSupabaseUser(user, metadata);
    console.log('✅ [GET_USER] 사용자 로드 완료:', convertedUser?.name);
    
    return convertedUser;
  } catch (error) {
    console.error('❌ [GET_USER] 오류:', error instanceof Error ? error.message : '알 수 없는 오류');
    return null;
  }
};

// 권한 관련 함수들 (기존 코드 유지)
export const hasPermission = (user: User | null, _permission: string): boolean => {
  if (!user) return false;
  // 간단한 권한 체크 (필요시 확장)
  // _permission 매개변수는 나중에 사용할 수 있도록 유지 (언더스코어로 사용하지 않음을 표시)
  return user.role === 'admin' || user.role === 'teacher';
};

export const canEditSettings = (user: User | null): boolean => {
  return hasPermission(user, 'edit_settings');
};

