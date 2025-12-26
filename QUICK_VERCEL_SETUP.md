# Vercel 환경 변수 빠른 설정 가이드

## 🚀 빠른 설정 (3단계)

### 1. Vercel 대시보드 접속
https://vercel.com/dashboard → 프로젝트 선택

### 2. 환경 변수 추가
**Settings** → **Environment Variables** → **Add New**

#### 변수 1:
- Key: `VITE_SUPABASE_URL`
- Value: `https://vgjeztzzguzkbotjgyct.supabase.co`
- Environment: ✅ Production, ✅ Preview

#### 변수 2:
- Key: `VITE_SUPABASE_ANON_KEY`
- Value: `sb_publishable_IZwZ-w8ytX0OSLzQPf8GyQ_nB2NGDNJ`
- Environment: ✅ Production, ✅ Preview

### 3. 재배포
**Deployments** → 최신 배포 → **"..."** → **Redeploy**

## ✅ 완료!

재배포 후 프로덕션 사이트에서 로그인이 정상적으로 작동합니다.

