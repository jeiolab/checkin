# Supabase RLS 정책 수정 가이드

## 문제 상황
출석부 탭으로 이동할 때 `user_profiles` 테이블에 대한 403 Forbidden 오류가 발생합니다.
```
GET https://vgjeztzzguzkbotjgyct.supabase.co/rest/v1/user_profiles?select=*&id=eq.fb240fd3-7b11-4d81-92cb-583b28d110c8 403 (Forbidden)
```

## 원인
`user_profiles` 테이블의 RLS (Row Level Security) 정책이 제대로 설정되지 않아서, 사용자가 자신의 프로필을 읽을 수 없습니다.

## 해결 방법

### 1. Supabase 대시보드 접속
1. https://supabase.com 접속
2. 프로젝트 선택 (vgjeztzzguzkbotjgyct)
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2. SQL 스크립트 실행
`check_supabase_rls.sql` 파일의 내용을 복사하여 SQL Editor에 붙여넣고 실행하세요.

또는 아래 SQL을 직접 실행하세요:

```sql
-- 기존 정책 삭제
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

-- 프로필 생성 정책
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

-- RLS 활성화 확인
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### 3. 확인
SQL 실행 후 브라우저를 새로고침하고 출석부 탭으로 이동해보세요. 403 오류가 사라져야 합니다.

## 참고
- RLS 정책은 보안을 위해 필수입니다
- 사용자는 자신의 프로필만 읽고 수정할 수 있습니다
- 관리자는 모든 프로필을 읽고 수정할 수 있습니다

