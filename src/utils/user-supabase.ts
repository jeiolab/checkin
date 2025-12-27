import { supabase } from './supabase';
import type { User, UserRole, Grade, Class } from '../types';
import { format } from 'date-fns';

/**
 * Supabase 사용자 관리 함수
 */

/**
 * auth.users에서 모든 사용자 가져오기 (RPC 함수 사용)
 * Supabase의 auth.users 테이블에서 모든 사용자 정보를 가져옵니다
 * RPC 함수가 없으면 user_profiles에서 사용자를 가져옵니다 (폴백)
 */
export const getAllAuthUsers = async (): Promise<User[]> => {
  try {
    console.log('[SUPABASE AUTH USERS] 모든 auth.users 사용자 조회 시작');
    
    // RPC 함수 호출 (서버에서 auth.users 조회)
    const { data, error } = await supabase.rpc('get_all_auth_users');

    if (error) {
      console.warn('[SUPABASE AUTH USERS] RPC 호출 오류 (폴백으로 user_profiles 사용):', error.message);
      console.log('[SUPABASE AUTH USERS] user_profiles에서 사용자 조회로 폴백');
      
      // RPC 함수가 없으면 user_profiles에서 사용자 가져오기 (폴백)
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) {
        console.error('[SUPABASE AUTH USERS] user_profiles 조회 오류:', profileError.message);
        return [];
      }

      console.log('[SUPABASE AUTH USERS] user_profiles에서 조회된 사용자 수:', profiles?.length || 0);

      const users: User[] = (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name || '이름 없음',
        email: profile.email || '',
        role: (profile.role || 'teacher') as UserRole,
        grade: profile.grade as Grade | undefined,
        class: profile.class as Class | undefined,
        subject: profile.subject || undefined,
        studentId: profile.student_id || undefined,
        createdAt: profile.created_at || format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        lastLogin: profile.updated_at || undefined,
        hasProfile: true, // user_profiles에서 가져왔으므로 true
      }));

      console.log('[SUPABASE AUTH USERS] 폴백으로 변환된 사용자 수:', users.length);
      return users;
    }

    console.log('[SUPABASE AUTH USERS] RPC에서 조회된 사용자 수:', data?.length || 0);
    
    // 첫 번째 사용자 데이터 구조 확인
    if (data && data.length > 0) {
      console.log('[SUPABASE AUTH USERS] 첫 번째 사용자 데이터 샘플:', {
        id: data[0].id,
        name: data[0].name,
        email: data[0].email,
        has_profile: data[0].has_profile,
        user_metadata: data[0].user_metadata
      });
    }

    const users: User[] = (data || []).map((authUser: any) => {
      // RPC 함수에서 이미 name을 가져왔으므로 그대로 사용
      // RPC 함수는 user_profiles의 name 우선, 없으면 auth.users의 user_metadata->name 사용
      const userName = authUser.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '이름 없음';
      
      console.log('[SUPABASE AUTH USERS] 사용자 변환:', {
        id: authUser.id,
        rpcName: authUser.name,
        metadataName: authUser.user_metadata?.name,
        email: authUser.email,
        finalName: userName,
        hasProfile: authUser.has_profile
      });
      
      return {
        id: authUser.id,
        name: userName,
        email: authUser.email || '',
        role: (authUser.user_metadata?.role || 'teacher') as UserRole,
        grade: authUser.user_metadata?.grade as Grade | undefined,
        class: authUser.user_metadata?.class as Class | undefined,
        subject: authUser.user_metadata?.subject || undefined,
        studentId: authUser.user_metadata?.studentId || undefined,
        createdAt: authUser.created_at || format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        lastLogin: authUser.last_sign_in_at || undefined,
        hasProfile: authUser.has_profile || false, // user_profiles에 존재하는지 여부
      };
    });

    console.log('[SUPABASE AUTH USERS] 변환된 사용자 수:', users.length);
    return users;
  } catch (error) {
    console.error('[SUPABASE AUTH USERS] 예외 발생:', error instanceof Error ? error.message : '알 수 없는 오류', error);
    // 예외 발생 시에도 폴백 시도
    try {
      console.log('[SUPABASE AUTH USERS] 예외 발생 후 폴백 시도');
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      return (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name || '이름 없음',
        email: profile.email || '',
        role: (profile.role || 'teacher') as UserRole,
        grade: profile.grade as Grade | undefined,
        class: profile.class as Class | undefined,
        subject: profile.subject || undefined,
        studentId: profile.student_id || undefined,
        createdAt: profile.created_at || format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        lastLogin: profile.updated_at || undefined,
        hasProfile: true,
      }));
    } catch (fallbackError) {
      console.error('[SUPABASE AUTH USERS] 폴백도 실패:', fallbackError);
      return [];
    }
  }
};

/**
 * 모든 사용자 가져오기 (관리자만)
 * Supabase의 user_profiles 테이블에서 모든 사용자 정보를 가져옵니다
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    console.log('[SUPABASE USERS] 모든 사용자 조회 시작');
    
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SUPABASE USERS] 사용자 목록 조회 오류:', error.message, error);
      return [];
    }

    console.log('[SUPABASE USERS] 조회된 사용자 수:', profiles?.length || 0);

    // 프로필에서 이메일 정보 가져오기 (admin API는 클라이언트에서 사용 불가)
    const users: User[] = (profiles || []).map(profile => ({
      id: profile.id,
      name: profile.name || '이름 없음',
      email: profile.email || '',
      role: (profile.role || 'teacher') as UserRole,
      grade: profile.grade as Grade | undefined,
      class: profile.class as Class | undefined,
      subject: profile.subject || undefined,
      studentId: profile.student_id || undefined,
      createdAt: profile.created_at || format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      lastLogin: profile.updated_at || undefined,
    }));

    console.log('[SUPABASE USERS] 변환된 사용자 수:', users.length);
    return users;
  } catch (error) {
    console.error('[SUPABASE USERS] 예외 발생:', error instanceof Error ? error.message : '알 수 없는 오류', error);
    return [];
  }
};

/**
 * 사용자 생성 (Supabase Auth + 프로필)
 * 주의: admin API는 서버 사이드에서만 사용 가능하므로,
 * 클라이언트에서는 signUp을 사용하거나 서버 API를 통해야 함
 */
export const createUser = async (
  email: string,
  password: string,
  metadata: {
    name: string;
    role: UserRole;
    grade?: Grade;
    class?: Class;
    subject?: string;
    studentId?: string;
  }
): Promise<{ user: User | null; error: string | null }> => {
  try {
    console.log('[SUPABASE USERS] 사용자 생성 시작:', { email, name: metadata.name, role: metadata.role });
    
    // 클라이언트에서는 signUp 사용 (서버 API가 없을 경우)
    // 실제로는 서버 API를 통해 admin.createUser를 사용하는 것이 좋음
    // 이메일 인증 없이 사용자 생성 (관리자가 생성하는 경우)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // 이메일 인증 없이 사용자 생성
        emailRedirectTo: undefined,
        // 이메일 확인 없이 사용 가능하도록 설정
        data: {
          name: metadata.name,
          role: metadata.role,
          grade: metadata.grade,
          class: metadata.class,
          subject: metadata.subject,
          studentId: metadata.studentId,
        },
      },
    });

    if (authError) {
      const errorMessage = authError.message || '사용자 생성에 실패했습니다.';
      console.error('[SUPABASE USERS] 사용자 생성 오류:', errorMessage, authError);
      
      // 구체적인 에러 메시지 제공
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        userFriendlyMessage = '이미 등록된 이메일 주소입니다.';
      } else if (errorMessage.includes('password')) {
        userFriendlyMessage = '비밀번호가 요구사항을 만족하지 않습니다.';
      } else if (errorMessage.includes('email')) {
        userFriendlyMessage = '유효하지 않은 이메일 주소입니다.';
      }
      
      return { user: null, error: userFriendlyMessage };
    }

    if (!authData.user) {
      const errorMessage = '사용자 생성에 실패했습니다. (사용자 데이터 없음)';
      console.error('[SUPABASE USERS] 사용자 생성 오류:', errorMessage);
      return { user: null, error: errorMessage };
    }

    console.log('[SUPABASE USERS] Auth 사용자 생성 완료:', authData.user.id);
    console.log('[SUPABASE USERS] 사용자 이메일 확인 상태:', authData.user.email_confirmed_at ? '확인됨' : '미확인');

    // 프로필은 트리거가 자동으로 생성하지만, 수동으로도 생성 가능
    // 잠시 대기 후 프로필 생성 시도 (트리거가 실행될 시간 확보)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        name: metadata.name,
        email: email,
        role: metadata.role,
        grade: metadata.grade,
        class: metadata.class,
        subject: metadata.subject,
        student_id: metadata.studentId,
      });

    if (profileError) {
      // 프로필이 이미 존재하는 경우 (트리거가 생성한 경우) 무시
      if (profileError.code === '23505' || profileError.message.includes('duplicate') || profileError.message.includes('already exists')) {
        console.log('[SUPABASE USERS] 프로필이 이미 존재함 (트리거가 생성한 것으로 추정)');
      } else {
        console.error('[SUPABASE USERS] 프로필 생성 오류:', profileError.message, profileError);
        // 프로필 생성 실패해도 사용자는 생성됨 (트리거가 생성할 수 있음)
        // 하지만 명시적으로 에러를 반환하지 않고 경고만 표시
        console.warn('[SUPABASE USERS] 프로필 생성 실패했지만 사용자는 생성됨. 트리거가 생성할 수 있음.');
      }
    } else {
      console.log('[SUPABASE USERS] 프로필 생성 완료');
    }

    const newUser: User = {
      id: authData.user.id,
      name: metadata.name,
      email: email,
      role: metadata.role,
      grade: metadata.grade,
      class: metadata.class,
      subject: metadata.subject,
      studentId: metadata.studentId,
      createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    };

    return { user: newUser, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    console.error('[SUPABASE USERS] 예외 발생:', errorMessage);
    return { user: null, error: errorMessage };
  }
};

/**
 * auth.users의 사용자를 user_profiles에 복사하고 역할 부여
 */
export const addUsersToProfiles = async (
  userIds: string[],
  role: UserRole
): Promise<{ success: number; failed: number; errors: string[] }> => {
  try {
    console.log('[SUPABASE USERS] 사용자를 user_profiles에 추가 시작:', { userIds, role });
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // 먼저 모든 사용자 정보를 한 번에 가져오기 (RPC 함수 사용)
    const allAuthUsers = await getAllAuthUsers();
    const userMap = new Map(allAuthUsers.map(u => [u.id, u]));

    console.log('[SUPABASE USERS] 가져온 사용자 맵 크기:', userMap.size);
    console.log('[SUPABASE USERS] 처리할 사용자 ID:', userIds);

    for (const userId of userIds) {
      try {
        let userEmail = '';
        let userName = '';
        
        // 사용자 정보 가져오기
        const authUser = userMap.get(userId);
        
        if (authUser) {
          // getAllAuthUsers에서 가져온 정보 사용
          userEmail = authUser.email || '';
          userName = authUser.name || '이름 없음';
          console.log(`[SUPABASE USERS] 사용자 정보 (맵에서): ${userName} (${userEmail})`);
        } else {
          // RPC 함수로 사용자 정보 가져오기 시도
          console.log(`[SUPABASE USERS] 맵에 없음, RPC로 조회: ${userId}`);
          const { data: userData, error: rpcError } = await supabase.rpc('get_auth_user_by_id', { user_id: userId });
          
          if (rpcError) {
            console.error(`[SUPABASE USERS] RPC 오류 (${userId}):`, rpcError);
            
            // RPC 오류 시 user_profiles에서 직접 조회 시도 (폴백)
            console.log(`[SUPABASE USERS] RPC 실패, user_profiles에서 직접 조회 시도: ${userId}`);
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('id, email, name')
              .eq('id', userId)
              .single();
            
            if (profileError || !profileData) {
              const errorMsg = rpcError.message || '사용자 정보를 가져올 수 없습니다.';
              console.error(`[SUPABASE USERS] 폴백 조회도 실패 (${userId}):`, profileError?.message || '데이터 없음');
              errors.push(`${userId}: ${errorMsg}`);
              failCount++;
              continue;
            }
            
            // 폴백 성공: user_profiles에서 가져온 정보 사용
            userEmail = profileData.email || '';
            userName = profileData.name || '이름 없음';
            console.log(`[SUPABASE USERS] 사용자 정보 (폴백에서): ${userName} (${userEmail})`);
          } else if (!userData || userData.length === 0) {
            console.error(`[SUPABASE USERS] 사용자 데이터 없음: ${userId}`);
            errors.push(`${userId}: 사용자 정보를 가져올 수 없습니다.`);
            failCount++;
            continue;
          } else {
            // RPC 성공: RPC에서 가져온 정보 사용
            const userInfo = userData[0];
            userEmail = userInfo.email || '';
            // RPC 함수에서 name을 반환하므로 우선 사용
            userName = userInfo.name || userInfo.user_metadata?.name || userInfo.email?.split('@')[0] || '이름 없음';
            console.log(`[SUPABASE USERS] 사용자 정보 (RPC에서):`, {
              id: userId,
              name: userInfo.name,
              email: userInfo.email,
              metadataName: userInfo.user_metadata?.name,
              finalName: userName
            });
          }
        }

        if (!userEmail) {
          console.error(`[SUPABASE USERS] 이메일 없음: ${userId}`);
          errors.push(`${userName || userId}: 이메일 정보가 없습니다.`);
          failCount++;
          continue;
        }

        // user_profiles에 삽입 또는 업데이트
        console.log(`[SUPABASE USERS] 프로필 업서트 시도: ${userName} (${userEmail})`);
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: userId,
            email: userEmail,
            name: userName,
            role: role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error(`[SUPABASE USERS] 프로필 추가 실패 (${userId}):`, profileError);
          const errorMsg = profileError.message || '프로필 추가 실패';
          errors.push(`${userName || userId}: ${errorMsg}`);
          failCount++;
        } else {
          console.log(`[SUPABASE USERS] 프로필 추가 성공: ${userName} (${userEmail})`);
          successCount++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        console.error(`[SUPABASE USERS] 사용자 추가 중 예외 (${userId}):`, error);
        errors.push(`${userId}: ${errorMsg}`);
        failCount++;
      }
    }

    console.log('[SUPABASE USERS] 사용자 추가 완료:', { successCount, failCount, errors });
    return { success: successCount, failed: failCount, errors };
  } catch (error) {
    console.error('[SUPABASE USERS] 예외 발생:', error);
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    return { success: 0, failed: userIds.length, errors: [errorMsg] };
  }
};

/**
 * 사용자 업데이트
 */
export const updateUser = async (
  userId: string,
  updates: {
    name?: string;
    role?: UserRole;
    grade?: Grade;
    class?: Class;
    subject?: string;
    studentId?: string;
  }
): Promise<boolean> => {
  try {
    // 프로필 업데이트
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.grade !== undefined) updateData.grade = updates.grade;
    if (updates.class !== undefined) updateData.class = updates.class;
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.studentId !== undefined) updateData.student_id = updates.studentId;

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId);

    if (profileError) {
      if (import.meta.env.DEV) {
        console.error('[SUPABASE USERS] 프로필 업데이트 오류:', profileError.message);
      }
      return false;
    }

    // 메타데이터도 업데이트 (현재 사용자만 가능)
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: updates,
      });

      if (metadataError) {
        if (import.meta.env.DEV) {
          console.error('[SUPABASE USERS] 메타데이터 업데이트 오류:', metadataError.message);
        }
        // 메타데이터 업데이트 실패해도 프로필은 업데이트됨
      }
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SUPABASE USERS] 예외 발생:', error instanceof Error ? error.message : '알 수 없는 오류');
    }
    return false;
  }
};

/**
 * 사용자 삭제
 * 주의: admin API는 서버 사이드에서만 사용 가능하므로,
 * 클라이언트에서는 프로필만 삭제하거나 서버 API를 통해야 함
 */
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    // 프로필만 삭제 (실제로는 서버 API를 통해 auth.users에서도 삭제해야 함)
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[SUPABASE USERS] 사용자 삭제 오류:', error.message);
      }
      return false;
    }

    // 실제 프로덕션에서는 서버 API를 통해 auth.users에서도 삭제해야 함
    if (import.meta.env.DEV) {
      console.warn('[SUPABASE USERS] 프로필만 삭제됨. 서버 API를 통해 auth.users에서도 삭제해야 합니다.');
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SUPABASE USERS] 예외 발생:', error instanceof Error ? error.message : '알 수 없는 오류');
    }
    return false;
  }
};

/**
 * 비밀번호 변경
 */
export const changePassword = async (newPassword: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[SUPABASE USERS] 비밀번호 변경 오류:', error.message);
      }
      return false;
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SUPABASE USERS] 예외 발생:', error instanceof Error ? error.message : '알 수 없는 오류');
    }
    return false;
  }
};

