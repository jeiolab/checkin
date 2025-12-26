-- ============================================
-- 관리자 권한 부여 스크립트
-- ============================================
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- 1. 사용자 확인
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'neungju80@h.jne.go.kr';

-- 2. 프로필 확인
SELECT id, name, email, role 
FROM user_profiles 
WHERE email = 'neungju80@h.jne.go.kr';

-- 3. 프로필이 없으면 생성하고 관리자로 설정
INSERT INTO user_profiles (id, name, email, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  email,
  'admin'
FROM auth.users
WHERE email = 'neungju80@h.jne.go.kr'
ON CONFLICT (id) DO UPDATE
SET role = 'admin', name = COALESCE(EXCLUDED.name, user_profiles.name);

-- 4. 프로필이 이미 있으면 관리자로 업데이트
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'neungju80@h.jne.go.kr';

-- 5. 결과 확인
SELECT id, name, email, role, created_at, updated_at
FROM user_profiles
WHERE email = 'neungju80@h.jne.go.kr';

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 'neungju80@h.jne.go.kr 사용자가 관리자로 설정되었습니다!' AS message;

