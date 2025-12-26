import { createClient } from '@supabase/supabase-js';

// Supabase 환경 변수
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 개발 모드에서만 경고 표시
const isDev = import.meta.env.DEV;

if (!supabaseUrl || !supabaseAnonKey) {
  if (isDev) {
    console.warn('⚠️ Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
} else if (isDev) {
  // 개발 모드에서만 연결 정보 표시 (민감한 정보는 제외)
  console.log('✅ Supabase 연결됨');
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

