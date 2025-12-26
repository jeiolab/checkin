# Supabase URL 문제 해결

## 🔴 문제: ERR_NAME_NOT_RESOLVED

DNS 조회 결과: **도메인을 찾을 수 없음 (NXDOMAIN)**

이는 다음 중 하나를 의미합니다:
1. Supabase 프로젝트가 일시 중지되었거나 삭제됨
2. Supabase URL이 잘못됨
3. 프로젝트가 다른 URL로 이동됨

## ✅ 해결 방법

### 1단계: Supabase 대시보드에서 프로젝트 확인

1. **Supabase 대시보드** 접속: https://supabase.com/dashboard
2. 로그인 후 프로젝트 목록 확인
3. 프로젝트가 **일시 중지(Paused)** 상태인지 확인

### 2단계: 프로젝트 활성화

프로젝트가 일시 중지된 경우:
1. 프로젝트 선택
2. **Restore** 또는 **Resume** 버튼 클릭
3. 프로젝트가 활성화될 때까지 대기 (몇 분 소요)

### 3단계: 올바른 URL 확인

1. **Settings → General** 메뉴로 이동
2. **Project URL** 확인
3. 현재 `.env.local`의 URL과 비교:
   ```
   현재: https://twhnehyuikxgpoplohqm.supabase.co
   대시보드: [확인 필요]
   ```

### 4단계: .env.local 파일 업데이트

Supabase 대시보드에서 확인한 올바른 URL로 `.env.local` 파일을 업데이트:

```env
VITE_SUPABASE_URL=https://[올바른-프로젝트-id].supabase.co
VITE_SUPABASE_ANON_KEY=[올바른-키]
```

### 5단계: 개발 서버 재시작

```bash
# 서버 중지 (Ctrl+C)
npm run dev
```

### 6단계: 브라우저 새로고침

- Cmd+Shift+R (Mac) 또는 Ctrl+Shift+R (Windows)

## 🔍 확인 사항

### Supabase 프로젝트 상태 확인

대시보드에서 다음을 확인:
- [ ] 프로젝트가 **Active** 상태인지
- [ ] 프로젝트 URL이 올바른지
- [ ] API 키가 올바른지 (Settings → API)

### 네트워크 테스트

올바른 URL을 확인한 후:

```bash
# URL 접근 테스트
curl -I https://[올바른-프로젝트-id].supabase.co

# DNS 해결 테스트
nslookup [올바른-프로젝트-id].supabase.co
```

## 📝 다음 단계

1. **Supabase 대시보드**에서 프로젝트 상태 확인
2. 올바른 **Project URL** 확인
3. `.env.local` 파일 업데이트
4. 개발 서버 재시작
5. 로그인 재시도

## 🆘 프로젝트가 삭제된 경우

프로젝트가 삭제되었다면:
1. **새로운 Supabase 프로젝트** 생성
2. 데이터베이스 스키마 재생성
3. `.env.local` 파일 업데이트

