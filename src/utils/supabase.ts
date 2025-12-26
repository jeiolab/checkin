import { createClient } from '@supabase/supabase-js';

// Supabase 환경 변수
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// 개발 모드에서만 경고 표시
const isDev = import.meta.env.DEV;

// 환경 변수 검증
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = '❌ Supabase 환경 변수가 설정되지 않았습니다.\n' +
    '프로젝트 루트에 .env.local 파일을 생성하고 다음을 추가하세요:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key';
  
  if (isDev) {
    console.error(errorMsg);
  } else {
    // 프로덕션에서는 화면에 표시
    console.error('Supabase 환경 변수가 설정되지 않았습니다.');
  }
}

// Supabase 클라이언트 생성
// 환경 변수가 없으면 더미 클라이언트 생성 (오류 방지)
let supabaseClient;
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } else {
    // 더미 클라이언트 (오류 방지용)
    supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
} catch (error) {
  console.error('Supabase 클라이언트 생성 오류:', error);
  // 폴백: 더미 클라이언트
  supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export const supabase = supabaseClient;

// 사용자 메타데이터 타입
export interface UserMetadata {
  name?: string;
  role?: 'admin' | 'teacher' | 'subject_teacher' | 'student_monitor';
  grade?: number;
  class?: number;
  subject?: string;
  studentId?: string;
}

