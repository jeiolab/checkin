# 환경 변수 설정 가이드

## 🔧 문제 해결

### 오류: `supabaseUrl is required`

이 오류는 Supabase 환경 변수가 제대로 로드되지 않았을 때 발생합니다.

## 해결 방법

### 1단계: .env.local 파일 확인

프로젝트 루트에 `.env.local` 파일이 있는지 확인하고, 다음 형식으로 작성되어 있는지 확인하세요:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**중요**: 
- `VITE_` 접두사가 있어야 합니다
- 값에 따옴표나 공백이 없어야 합니다
- URL은 `https://`로 시작해야 합니다

### 2단계: 개발 서버 재시작

환경 변수를 변경한 후에는 **반드시 개발 서버를 재시작**해야 합니다:

```bash
# 서버 중지 (Ctrl+C)
# 그 다음 다시 시작
npm run dev
```

### 3단계: 브라우저 캐시 삭제

1. **강제 새로고침**: Cmd+Shift+R (Mac) 또는 Ctrl+Shift+R (Windows)
2. 또는 **브라우저 캐시 삭제** 후 다시 접속

### 4단계: 확인

브라우저 콘솔에서 다음을 실행하여 환경 변수가 로드되었는지 확인:

```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

## 📝 .env.local 파일 예시

```env
# Supabase 설정
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
```

## ⚠️ 주의사항

1. **.env.local 파일은 Git에 커밋하지 마세요**
   - `.gitignore`에 이미 포함되어 있습니다
   - 환경 변수는 민감한 정보입니다

2. **프로덕션 배포 시**
   - Vercel, Netlify 등에서는 환경 변수를 대시보드에서 설정해야 합니다
   - 빌드 시 환경 변수가 포함되도록 설정하세요

3. **환경 변수 이름**
   - Vite에서는 `VITE_` 접두사가 필요합니다
   - 접두사 없이는 클라이언트에서 접근할 수 없습니다

## 🔍 문제가 계속되면

1. `.env.local` 파일의 내용 확인
2. 파일 이름이 정확한지 확인 (`.env.local` 또는 `.env`)
3. 개발 서버 완전히 재시작
4. 브라우저 콘솔에서 환경 변수 확인

