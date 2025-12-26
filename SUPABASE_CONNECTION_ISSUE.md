# Supabase 연결 문제 해결 가이드

## 🔴 오류: ERR_NAME_NOT_RESOLVED

### 오류 메시지
```
POST https://twhnehyuikxgpoplohqm.supabase.co/auth/v1/token?grant_type=password 
net::ERR_NAME_NOT_RESOLVED
```

## 🔍 원인 분석

이 오류는 다음 중 하나일 수 있습니다:

1. **Supabase 프로젝트가 일시 중지됨**
   - 무료 플랜의 경우 일정 시간 비활성화 시 자동으로 일시 중지됨
   - Supabase 대시보드에서 프로젝트 상태 확인 필요

2. **네트워크 연결 문제**
   - 인터넷 연결 확인
   - 방화벽 또는 프록시 설정 확인

3. **DNS 해결 문제**
   - 도메인 이름을 IP 주소로 변환하지 못함

4. **Supabase URL이 잘못됨**
   - 프로젝트 URL이 변경되었을 수 있음

## ✅ 해결 방법

### 1단계: Supabase 프로젝트 상태 확인

1. **Supabase 대시보드** 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. **Settings → General** 메뉴로 이동
4. **Project URL** 확인:
   - 현재 설정: `https://twhnehyuikxgpoplohqm.supabase.co`
   - 대시보드에 표시된 URL과 일치하는지 확인

### 2단계: 프로젝트 활성화

프로젝트가 일시 중지된 경우:
1. Supabase 대시보드에서 프로젝트 선택
2. **Restore** 또는 **Resume** 버튼 클릭
3. 프로젝트가 활성화될 때까지 대기 (몇 분 소요될 수 있음)

### 3단계: 네트워크 연결 확인

터미널에서 다음 명령어 실행:

```bash
# Supabase URL 접근 테스트
curl -I https://twhnehyuikxgpoplohqm.supabase.co

# DNS 해결 테스트
nslookup twhnehyuikxgpoplohqm.supabase.co
```

**예상 결과:**
- `curl` 명령어가 HTTP 응답을 받아야 함
- `nslookup`이 IP 주소를 반환해야 함

### 4단계: .env.local 파일 재확인

`.env.local` 파일의 URL이 Supabase 대시보드의 URL과 정확히 일치하는지 확인:

```env
VITE_SUPABASE_URL=https://twhnehyuikxgpoplohqm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZRfDBAgcnmch1TAoBMkZ8A_YrPPUh9O
```

### 5단계: 개발 서버 재시작

환경 변수를 확인한 후:

```bash
# 서버 중지 (Ctrl+C)
npm run dev
```

### 6단계: 브라우저 캐시 삭제

1. **강제 새로고침**: Cmd+Shift+R (Mac) 또는 Ctrl+Shift+R (Windows)
2. 또는 **브라우저 캐시 완전 삭제** 후 다시 접속

## 🔧 추가 확인 사항

### Supabase 프로젝트 설정 확인

1. **API Settings** 확인:
   - Settings → API
   - **Project URL** 확인
   - **anon public** 키 확인

2. **Authentication** 설정 확인:
   - Authentication → Settings
   - **Site URL** 설정 확인
   - **Redirect URLs** 설정 확인

### 네트워크 문제 해결

1. **다른 네트워크에서 시도**
   - 모바일 핫스팟 사용
   - 다른 Wi-Fi 네트워크 연결

2. **VPN 사용 중인 경우**
   - VPN 비활성화 후 재시도
   - 또는 VPN 서버 변경

3. **방화벽 설정 확인**
   - 회사/학교 네트워크의 경우 방화벽이 Supabase 도메인을 차단할 수 있음

## 📝 체크리스트

- [ ] Supabase 대시보드에서 프로젝트가 활성 상태인지 확인
- [ ] 프로젝트 URL이 .env.local과 일치하는지 확인
- [ ] 네트워크 연결이 정상인지 확인
- [ ] DNS 해결이 정상인지 확인 (nslookup)
- [ ] 개발 서버가 재시작됨
- [ ] 브라우저가 완전히 새로고침됨

## 🆘 문제가 계속되면

1. **Supabase 대시보드**에서 프로젝트 상태 확인
2. **Supabase 지원팀**에 문의
3. **새로운 Supabase 프로젝트** 생성 고려

