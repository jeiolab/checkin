# RLS 정책 무한 재귀 오류 해결 가이드

## 🔴 문제

오류 메시지: `infinite recursion detected in policy for relation "user_profiles"`

이 오류는 RLS(Row Level Security) 정책이 순환 참조를 하여 발생합니다.

## 🔍 원인

"Admins can view all profiles" 정책이 관리자인지 확인하기 위해 `user_profiles` 테이블을 조회하는데, 그 조회 자체가 다시 정책을 확인하려고 해서 무한 재귀가 발생합니다.

## ✅ 해결 방법

### 1단계: Supabase 대시보드에서 RLS 정책 수정

1. **Supabase 대시보드 접속**: https://supabase.com/dashboard
2. **프로젝트 선택**: `jeiolab's Project`
3. **SQL Editor** 클릭
4. **`fix_rls_policies.sql` 파일 내용 복사**하여 실행

또는 SQL Editor에 직접 입력:

```sql
-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 2. 새로운 정책 생성 (무한 재귀 방지)

-- 사용자는 자신의 프로필 조회 가능
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- 관리자는 모든 프로필 조회 가능 (auth.users 메타데이터 사용)
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

-- 사용자는 자신의 프로필 수정 가능
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- 관리자는 모든 프로필 수정 가능
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

-- 사용자는 자신의 프로필 생성 가능
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 관리자는 프로필 생성 가능
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
```

### 2단계: 사용자 메타데이터에 관리자 역할 추가

관리자 정책이 `auth.users.raw_user_meta_data->>'role'`을 확인하므로, 사용자 메타데이터에 역할을 추가해야 합니다:

```sql
-- 사용자 메타데이터 업데이트
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'neungju80@h.jne.go.kr';
```

### 3단계: 프로필 수동 생성

RLS 정책이 수정된 후, 프로필을 수동으로 생성:

```sql
-- 프로필 생성
INSERT INTO user_profiles (id, name, email, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  email,
  'admin'
FROM auth.users
WHERE email = 'neungju80@h.jne.go.kr'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    updated_at = NOW();
```

### 4단계: 브라우저 새로고침

1. **브라우저 완전히 새로고침**: Cmd+Shift+R (Mac) 또는 Ctrl+Shift+R (Windows)
2. **로그아웃** 후 다시 **로그인**

## 🔍 확인 방법

### Supabase에서 확인

1. **Table Editor → user_profiles**
2. 이메일 `neungju80@h.jne.go.kr` 검색
3. `role`이 `admin`인지 확인

### 브라우저 콘솔에서 확인

1. **F12** 또는 **Cmd+Option+I** (Mac)로 개발자 도구 열기
2. **Console 탭** 확인
3. 다음 메시지 확인:
   - `[SUPABASE] 프로필 조회 결과:` → `profileRole: 'admin'`
   - `[SUPABASE] 최종 사용자 역할:` → `'admin'`
   - 오류 메시지가 없는지 확인

## 📋 체크리스트

- [ ] RLS 정책 수정 (무한 재귀 방지)
- [ ] 사용자 메타데이터에 역할 추가
- [ ] 프로필 수동 생성
- [ ] 브라우저 새로고침
- [ ] 로그아웃 후 다시 로그인
- [ ] 브라우저 콘솔에서 오류 확인
- [ ] 관리자 역할 확인

## 🆘 문제가 계속되면

1. **Supabase 로그 확인**: Settings → Logs
2. **RLS 정책 확인**: SQL Editor에서 `SELECT * FROM pg_policies WHERE tablename = 'user_profiles';`
3. **프로필 직접 확인**: Table Editor에서 확인

