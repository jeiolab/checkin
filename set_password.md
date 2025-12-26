# 비밀번호 설정 가이드

## 비밀번호: `flqjvnf@81`

## 방법 1: Supabase 대시보드에서 변경 (권장)

### 1단계: 사용자 찾기

1. **Supabase 대시보드**: https://supabase.com/dashboard
2. **프로젝트 선택**: `jeiolab's Project`
3. **Authentication → Users** 클릭
4. 이메일 `neungju80@h.jne.go.kr` 검색

### 2단계: 비밀번호 변경

1. 사용자 행의 **"..." 메뉴** 클릭
2. **"Reset password"** 또는 **"Update password"** 선택
3. 새 비밀번호 입력: `flqjvnf@81`
4. **"Update"** 클릭

또는:

1. 사용자 클릭하여 상세 페이지 열기
2. **"Reset Password"** 버튼 클릭
3. 새 비밀번호 입력: `flqjvnf@81`
4. 저장

## 방법 2: 앱에서 비밀번호 변경

1. **로그인**: `neungju80@h.jne.go.kr`로 로그인
2. **설정** 메뉴 클릭
3. **비밀번호 변경** 메뉴 클릭
4. 현재 비밀번호 입력 (알고 있는 비밀번호)
5. 새 비밀번호 입력: `flqjvnf@81`
6. 비밀번호 확인: `flqjvnf@81`
7. **변경** 버튼 클릭

## 방법 3: SQL로 비밀번호 해시 생성 (고급)

Supabase는 비밀번호를 bcrypt로 해싱해서 저장합니다. 직접 SQL로 변경하려면:

1. **Supabase 대시보드 → SQL Editor**
2. 다음 SQL 실행:

```sql
-- 비밀번호 해시 생성 및 업데이트
-- 주의: 이 방법은 복잡하고 권장하지 않습니다
-- 대신 Supabase 대시보드에서 변경하는 것을 권장합니다

-- 사용자 ID 확인
SELECT id, email FROM auth.users WHERE email = 'neungju80@h.jne.go.kr';

-- 비밀번호는 Supabase 대시보드에서 변경하는 것이 가장 안전합니다
```

## ⚠️ 주의사항

- 비밀번호는 안전하게 관리하세요
- SQL로 직접 비밀번호를 변경하는 것은 복잡하고 위험할 수 있습니다
- Supabase 대시보드에서 변경하는 것이 가장 안전하고 간단합니다

## ✅ 확인 방법

1. **로그아웃** 후 다시 로그인
2. 새 비밀번호 `flqjvnf@81`로 로그인 테스트
3. 로그인이 성공하면 비밀번호 변경 완료!

