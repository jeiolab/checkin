-- Supabase RLS 정책 확인 및 수정 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. user_profiles 테이블의 현재 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 2. user_profiles 테이블의 RLS 활성화 상태 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'user_profiles';

-- 3. 사용자가 자신의 프로필을 읽을 수 있도록 RLS 정책 생성/수정
-- 기존 정책이 있으면 삭제하고 새로 생성
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON user_profiles;

-- 자신의 프로필 읽기 정책
CREATE POLICY "Users can read their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 자신의 프로필 업데이트 정책
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 프로필 생성 정책 (자신의 프로필만 생성 가능)
CREATE POLICY "Users can insert their own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 관리자는 모든 프로필 읽기 가능 (무한 재귀 방지를 위해 auth.users 참조)
CREATE POLICY "Admins can read all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  OR (SELECT (raw_user_meta_data->>'role') FROM auth.users WHERE id = auth.uid()) = 'admin'
);

-- 관리자는 모든 프로필 업데이트 가능 (무한 재귀 방지를 위해 auth.users 참조)
CREATE POLICY "Admins can update all profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  OR (SELECT (raw_user_meta_data->>'role') FROM auth.users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  OR (SELECT (raw_user_meta_data->>'role') FROM auth.users WHERE id = auth.uid()) = 'admin'
);

-- 4. RLS 활성화 확인
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. 정책 확인
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

