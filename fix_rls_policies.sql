-- ============================================
-- RLS 정책 무한 재귀 문제 해결
-- ============================================
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 2. 새로운 정책 생성 (무한 재귀 방지)

-- 정책: 모든 사용자는 자신의 프로필 조회 가능
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- 정책: 관리자는 모든 프로필 조회 가능 (무한 재귀 방지)
-- auth.users의 raw_user_meta_data를 사용하여 관리자 확인
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      )
    )
  );

-- 정책: 사용자는 자신의 프로필 수정 가능
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- 정책: 관리자는 모든 프로필 수정 가능 (무한 재귀 방지)
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      )
    )
  );

-- 정책: 사용자는 자신의 프로필 생성 가능
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 정책: 관리자는 프로필 생성 가능 (무한 재귀 방지)
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      )
    )
  );

-- 3. 더 간단한 정책으로 재생성 (권장)
-- 위의 정책이 여전히 문제가 있다면 아래 정책 사용

-- 기존 정책 다시 삭제
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;

-- 간단한 관리자 정책 (auth.users의 메타데이터만 사용)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    (auth.uid() = id) OR
    (EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    ))
  );

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    (auth.uid() = id) OR
    (EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    ))
  );

CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    (auth.uid() = id) OR
    (EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    ))
  );

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 'RLS 정책이 수정되었습니다. 무한 재귀 문제가 해결되었습니다!' AS message;

