# Supabase 로그인 시스템 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입하고 새 프로젝트 생성
2. 프로젝트 설정에서 다음 정보 확인:
   - Project URL (예: `https://xxxxx.supabase.co`)
   - API Key (anon/public key)

## 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**중요**: `.env.local` 파일은 Git에 커밋되지 않습니다 (`.gitignore`에 포함됨)

## 3. Supabase 데이터베이스 설정

### 3.1 사용자 프로필 테이블 생성

Supabase 대시보드 → SQL Editor에서 다음 SQL 실행:

```sql
-- 사용자 프로필 테이블 생성
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher', 'subject_teacher', 'student_monitor')),
  grade INTEGER,
  class INTEGER,
  subject TEXT,
  student_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자는 자신의 프로필 조회 가능
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- 정책: 관리자는 모든 프로필 조회 가능
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 정책: 사용자는 자신의 프로필 수정 가능
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- 정책: 관리자는 모든 프로필 수정 가능
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 정책: 관리자는 프로필 생성 가능
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 사용자 생성 시 프로필 자동 생성 트리거

```sql
-- 사용자 생성 시 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## 4. 초기 관리자 계정 생성

### 방법 1: Supabase 대시보드에서 생성

1. Supabase 대시보드 → Authentication → Users
2. "Add user" 클릭
3. 이메일과 비밀번호 입력
4. "Auto Confirm User" 체크
5. "Create user" 클릭
6. 생성된 사용자의 UUID 확인
7. SQL Editor에서 다음 실행:

```sql
-- 관리자 권한 부여
UPDATE user_profiles
SET role = 'admin', name = '관리자'
WHERE id = '사용자-UUID-여기에-입력';
```

### 방법 2: SQL로 직접 생성

```sql
-- 관리자 계정 생성 (Supabase Auth)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('your-password-here', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"name": "관리자", "role": "admin"}'::jsonb
) RETURNING id;

-- 위에서 반환된 UUID를 사용하여 프로필 생성
-- (트리거가 자동으로 생성하지만, 수동으로도 가능)
```

## 5. 사용자 관리

### 사용자 추가

Supabase Auth를 통해 사용자를 추가하면 자동으로 `user_profiles` 테이블에 프로필이 생성됩니다.

### 사용자 메타데이터 업데이트

```sql
-- 사용자 프로필 업데이트
UPDATE user_profiles
SET 
  name = '새 이름',
  role = 'teacher',
  grade = 1,
  class = 1
WHERE email = 'user@example.com';
```

## 6. 로그인 방식

### 이메일로 로그인
- 이메일 주소와 비밀번호로 로그인

### 이름으로 로그인
- 이름을 입력하면 자동으로 해당 이름의 이메일을 찾아서 로그인
- `user_profiles` 테이블에서 이름으로 이메일 조회 후 로그인

## 7. 보안 설정

### RLS (Row Level Security)
- 모든 테이블에 RLS 활성화
- 사용자는 자신의 데이터만 조회/수정 가능
- 관리자는 모든 데이터 조회/수정 가능

### API 키 보안
- `anon` 키는 클라이언트에서 사용 (공개 가능)
- `service_role` 키는 서버에서만 사용 (절대 클라이언트에 노출 금지)

## 8. 문제 해결

### 로그인이 안 되는 경우
1. 환경 변수가 올바르게 설정되었는지 확인
2. Supabase 프로젝트 URL과 API 키 확인
3. 브라우저 콘솔에서 오류 메시지 확인
4. Supabase 대시보드에서 사용자가 생성되었는지 확인

### 사용자 프로필이 생성되지 않는 경우
1. 트리거가 올바르게 생성되었는지 확인
2. `user_profiles` 테이블이 존재하는지 확인
3. 수동으로 프로필 생성:

```sql
INSERT INTO user_profiles (id, name, email, role)
VALUES (
  '사용자-UUID',
  '사용자 이름',
  'user@example.com',
  'teacher'
);
```

## 9. 마이그레이션 (기존 localStorage 사용자)

기존 localStorage에 저장된 사용자를 Supabase로 마이그레이션하려면:

1. 기존 사용자 데이터 내보내기
2. Supabase Auth로 사용자 생성
3. `user_profiles` 테이블에 프로필 생성

자세한 마이그레이션 스크립트는 필요시 제공 가능합니다.

