import { createClient } from '@supabase/supabase-js';

// Supabase 환경 변수
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
} else {
  console.log('✅ Supabase 연결 정보:', { 
    url: supabaseUrl, 
    hasKey: !!supabaseAnonKey,
    keyLength: supabaseAnonKey.length 
  });
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// 사용자 메타데이터 타입
export interface UserMetadata {
  name?: string;
  role?: 'admin' | 'teacher' | 'subject_teacher' | 'student_monitor';
  grade?: number;
  class?: number;
  subject?: string;
  studentId?: string;
}

