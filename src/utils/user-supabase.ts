import { supabase } from './supabase';
import type { User, UserRole, Grade, Class } from '../types';
import { format } from 'date-fns';

/**
 * Supabase 사용자 관리 함수
 */

/**
 * 모든 사용자 가져오기 (관리자만)
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SUPABASE USERS] 사용자 목록 조회 오류:', error);
      return [];
    }

    // auth.users와 조인하여 이메일 정보 가져오기
    const users: User[] = [];
    for (const profile of profiles || []) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      
      users.push({
        id: profile.id,
        name: profile.name,
        email: authUser?.user?.email || profile.email,
        role: profile.role as UserRole,
        grade: profile.grade as Grade | undefined,
        class: profile.class as Class | undefined,
        subject: profile.subject || undefined,
        studentId: profile.student_id || undefined,
        createdAt: profile.created_at || format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        lastLogin: profile.updated_at || undefined,
      });
    }

    return users;
  } catch (error) {
    console.error('[SUPABASE USERS] 예외 발생:', error);
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
): Promise<User | null> => {
  try {
    // 클라이언트에서는 signUp 사용 (서버 API가 없을 경우)
    // 실제로는 서버 API를 통해 admin.createUser를 사용하는 것이 좋음
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
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

    if (authError || !authData.user) {
      console.error('[SUPABASE USERS] 사용자 생성 오류:', authError);
      return null;
    }

    // 프로필은 트리거가 자동으로 생성하지만, 수동으로도 생성 가능
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
      console.error('[SUPABASE USERS] 프로필 생성 오류:', profileError);
      // 프로필 생성 실패해도 사용자는 생성됨
    }

    return {
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
  } catch (error) {
    console.error('[SUPABASE USERS] 예외 발생:', error);
    return null;
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
      console.error('[SUPABASE USERS] 프로필 업데이트 오류:', profileError);
      return false;
    }

    // 메타데이터도 업데이트 (현재 사용자만 가능)
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: updates,
      });

      if (metadataError) {
        console.error('[SUPABASE USERS] 메타데이터 업데이트 오류:', metadataError);
        // 메타데이터 업데이트 실패해도 프로필은 업데이트됨
      }
    }

    return true;
  } catch (error) {
    console.error('[SUPABASE USERS] 예외 발생:', error);
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
      console.error('[SUPABASE USERS] 사용자 삭제 오류:', error);
      return false;
    }

    // 실제 프로덕션에서는 서버 API를 통해 auth.users에서도 삭제해야 함
    console.warn('[SUPABASE USERS] 프로필만 삭제됨. 서버 API를 통해 auth.users에서도 삭제해야 합니다.');

    return true;
  } catch (error) {
    console.error('[SUPABASE USERS] 예외 발생:', error);
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
      console.error('[SUPABASE USERS] 비밀번호 변경 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SUPABASE USERS] 예외 발생:', error);
    return false;
  }
};

