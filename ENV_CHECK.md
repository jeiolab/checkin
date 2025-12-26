# 환경 변수 확인 가이드

## 현재 .env.local 파일 내용

```
VITE_SUPABASE_URL=https://twhnehyuikxgpoplohqm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZRfDBAgcnmch1TAoBMkZ8A_YrPPUh9O
```

## 문제 해결 단계

### 1단계: 브라우저 콘솔에서 환경 변수 확인

브라우저 개발자 도구(F12) → Console 탭에서 다음을 실행:

```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '설정됨' : '없음');
```

**예상 결과:**
```
Supabase URL: https://twhnehyuikxgpoplohqm.supabase.co
Supabase Key: 설정됨
```

**문제가 있는 경우:**
- `undefined`가 표시되면 → 개발 서버를 재시작하세요
- 빈 문자열이 표시되면 → .env.local 파일 형식을 확인하세요

### 2단계: 개발 서버 재시작

환경 변수를 변경한 후에는 **반드시** 개발 서버를 재시작해야 합니다:

```bash
# 서버 중지 (Ctrl+C)
npm run dev
```

### 3단계: .env.local 파일 형식 확인

**올바른 형식:**
```env
VITE_SUPABASE_URL=https://twhnehyuikxgpoplohqm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZRfDBAgcnmch1TAoBMkZ8A_YrPPUh9O
```

**잘못된 형식:**
```env
# 따옴표 사용 (X)
VITE_SUPABASE_URL="https://twhnehyuikxgpoplohqm.supabase.co"

# 공백 포함 (X)
VITE_SUPABASE_URL = https://twhnehyuikxgpoplohqm.supabase.co

# 주석과 같은 줄 (X)
VITE_SUPABASE_URL=https://twhnehyuikxgpoplohqm.supabase.co # 주석
```

### 4단계: 브라우저 완전 새로고침

1. **강제 새로고침**: Cmd+Shift+R (Mac) 또는 Ctrl+Shift+R (Windows)
2. 또는 **브라우저 캐시 삭제** 후 다시 접속

### 5단계: 로그인 시도 시 콘솔 확인

로그인을 시도하면 다음 로그들이 표시됩니다:

```
🔐 [LOGIN] 로그인 시작
📧 [LOGIN] 이메일: your-email@example.com
🔑 [LOGIN] 비밀번호 길이: 8
🌐 [LOGIN] Supabase URL: 설정됨
🔑 [LOGIN] Supabase Key: 설정됨
🚀 [LOGIN] Supabase Auth 로그인 시도...
```

**문제가 있는 경우:**
- `🌐 [LOGIN] Supabase URL: ❌ 없음` → 환경 변수가 로드되지 않음
- `🔑 [LOGIN] Supabase Key: ❌ 없음` → 환경 변수가 로드되지 않음

## 체크리스트

- [ ] .env.local 파일이 프로젝트 루트에 있음
- [ ] 파일 형식이 올바름 (공백, 따옴표 없음)
- [ ] VITE_ 접두사가 있음
- [ ] 개발 서버가 재시작됨
- [ ] 브라우저가 완전히 새로고침됨
- [ ] 브라우저 콘솔에서 환경 변수가 로드되었는지 확인됨

