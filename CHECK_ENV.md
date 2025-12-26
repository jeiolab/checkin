# 환경 변수 확인 가이드

## 🔍 현재 .env.local 파일 내용

```
VITE_SUPABASE_URL=https://twhnehyuikxgpoplohqm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZRfDBAgcnmch1TAoBMkZ8A_YrPPUh9O
```

## ✅ 환경 변수가 로드되었는지 확인

### 1단계: 브라우저 콘솔에서 확인

브라우저 개발자 도구(F12) → Console 탭에서 다음을 실행:

```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

**예상 결과:**
```
Supabase URL: https://twhnehyuikxgpoplohqm.supabase.co
Has Key: true
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

### 3단계: 브라우저 완전 새로고침

1. **강제 새로고침**: Cmd+Shift+R (Mac) 또는 Ctrl+Shift+R (Windows)
2. 또는 **브라우저 캐시 삭제** 후 다시 접속

## 🔧 문제 해결

### 문제 1: 환경 변수가 `undefined`로 표시됨

**원인**: 개발 서버가 재시작되지 않음

**해결**:
1. 개발 서버 완전히 중지 (Ctrl+C)
2. `npm run dev`로 다시 시작
3. 브라우저 완전 새로고침

### 문제 2: .env.local 파일이 인식되지 않음

**확인 사항**:
- 파일 이름이 정확한지 확인 (`.env.local` 또는 `.env`)
- 파일이 프로젝트 루트에 있는지 확인
- 파일 형식이 올바른지 확인 (공백, 따옴표 없음)

**올바른 형식:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
```

**잘못된 형식:**
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"  # 따옴표 제거
VITE_SUPABASE_URL = https://your-project.supabase.co  # 공백 제거
```

### 문제 3: 환경 변수는 로드되었지만 여전히 오류 발생

**확인 사항**:
1. Supabase URL이 올바른지 확인
2. API 키가 올바른지 확인
3. Supabase 프로젝트가 활성 상태인지 확인

## 📝 체크리스트

- [ ] .env.local 파일이 프로젝트 루트에 있음
- [ ] 파일 형식이 올바름 (공백, 따옴표 없음)
- [ ] VITE_ 접두사가 있음
- [ ] 개발 서버가 재시작됨
- [ ] 브라우저가 완전히 새로고침됨
- [ ] 브라우저 콘솔에서 환경 변수가 로드되었는지 확인됨

