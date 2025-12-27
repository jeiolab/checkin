-- Supabase RPC 함수 생성: auth.users에서 모든 사용자 가져오기
-- 이 함수는 관리자 권한이 있는 사용자만 호출할 수 있습니다.

-- 1. get_all_auth_users: auth.users에서 모든 사용자 정보 가져오기
CREATE OR REPLACE FUNCTION get_all_auth_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  user_metadata jsonb,
  has_profile boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data as user_metadata,
    EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.id = au.id
    ) as has_profile
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;

-- 2. get_auth_user_by_id: 특정 사용자 ID로 auth.users에서 사용자 정보 가져오기
CREATE OR REPLACE FUNCTION get_auth_user_by_id(user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  user_metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data as user_metadata
  FROM auth.users au
  WHERE au.id = user_id;
END;
$$;

-- 권한 부여: 인증된 사용자만 호출 가능
GRANT EXECUTE ON FUNCTION get_all_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_user_by_id(uuid) TO authenticated;

-- 주의: SECURITY DEFINER로 설정되어 있어서 관리자 권한이 있는 사용자만 호출해야 합니다.
-- RLS 정책을 추가하여 관리자만 호출할 수 있도록 제한하는 것을 권장합니다.

