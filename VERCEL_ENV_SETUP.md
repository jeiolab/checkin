# Vercel 프로덕션 환경 변수 설정 가이드

## 🔴 문제

개발 서버에서는 로그인이 되지만, Vercel에 배포한 프로덕션 사이트에서는 "Supabase 설정이 올바르지 않습니다" 오류가 발생합니다.

## 원인

`.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다. 따라서 Vercel에 배포할 때 환경 변수가 포함되지 않습니다.

## ✅ 해결 방법: Vercel 대시보드에서 환경 변수 설정

### 1단계: Vercel 대시보드 접속

1. **Vercel 대시보드** 접속: https://vercel.com/dashboard
2. 프로젝트 선택

### 2단계: 환경 변수 설정

1. **Settings** 메뉴 클릭
2. **Environment Variables** 섹션으로 이동
3. 다음 환경 변수를 추가:

#### 환경 변수 1: VITE_SUPABASE_URL
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://vgjeztzzguzkbotjgyct.supabase.co`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택사항)

#### 환경 변수 2: VITE_SUPABASE_ANON_KEY
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `sb_publishable_IZwZ-w8ytX0OSLzQPf8GyQ_nB2NGDNJ`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택사항)

### 3단계: 환경 변수 추가 후 재배포

환경 변수를 추가한 후:

1. **Deployments** 탭으로 이동
2. 최신 배포의 **"..."** 메뉴 클릭
3. **Redeploy** 선택
   - 또는 새로운 커밋을 푸시하면 자동으로 재배포됩니다

### 4단계: 확인

재배포가 완료된 후:

1. 프로덕션 사이트 접속
2. 브라우저 콘솔(F12)에서 확인:
   ```javascript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '설정됨' : '없음');
   ```

## 📝 스크린샷 가이드

### Vercel 환경 변수 설정 화면

1. **Settings** → **Environment Variables**
2. **Add New** 버튼 클릭
3. Key와 Value 입력
4. Environment 선택 (Production, Preview, Development)
5. **Save** 클릭

## ⚠️ 중요 사항

### 환경 변수 이름
- **반드시** `VITE_` 접두사가 있어야 합니다
- Vite는 `VITE_`로 시작하는 환경 변수만 클라이언트에 노출합니다

### 환경 변수 값
- 따옴표 없이 입력
- 공백 없이 입력
- URL은 `https://`로 시작

### 보안
- 환경 변수는 Vercel 대시보드에서만 관리
- Git에 커밋하지 않음 (이미 `.gitignore`에 포함됨)
- API 키는 민감한 정보이므로 공유하지 않음

## 🔧 문제 해결

### 환경 변수가 적용되지 않는 경우

1. **재배포 확인**
   - 환경 변수를 추가한 후 반드시 재배포해야 합니다
   - 새로운 커밋을 푸시하면 자동으로 재배포됩니다

2. **환경 변수 이름 확인**
   - `VITE_SUPABASE_URL` (정확히 일치해야 함)
   - `VITE_SUPABASE_ANON_KEY` (정확히 일치해야 함)

3. **Environment 선택 확인**
   - Production 환경에 체크되어 있는지 확인

4. **빌드 로그 확인**
   - Vercel 대시보드 → Deployments → 최신 배포 → Build Logs
   - 환경 변수가 로드되었는지 확인

## 📋 체크리스트

- [ ] Vercel 대시보드 접속
- [ ] Settings → Environment Variables로 이동
- [ ] `VITE_SUPABASE_URL` 추가 (Production 체크)
- [ ] `VITE_SUPABASE_ANON_KEY` 추가 (Production 체크)
- [ ] 재배포 실행
- [ ] 프로덕션 사이트에서 환경 변수 확인
- [ ] 로그인 테스트

## 🆘 추가 도움

문제가 계속되면:
1. Vercel 대시보드의 **Build Logs** 확인
2. 브라우저 콘솔의 오류 메시지 확인
3. Vercel 지원팀에 문의

