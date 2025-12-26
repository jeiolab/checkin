# 로그인 문제 해결 가이드

## 🔴 현재 문제

네트워크 연결 오류: `ERR_NAME_NOT_RESOLVED` 또는 `Could not resolve host`

이는 Supabase 서버에 연결할 수 없다는 의미입니다.

## ✅ 즉시 확인할 사항

### 1단계: Supabase 프로젝트 상태 확인

1. **Supabase 대시보드 접속**: https://supabase.com/dashboard
2. **프로젝트 선택**: `jeiolab's Project`
3. **프로젝트 상태 확인**:
   - 프로젝트가 **일시 중지(Paused)** 상태인가요?
   - 프로젝트가 **활성(Active)** 상태인가요?

### 2단계: 프로젝트가 일시 중지된 경우

1. **"Restore project"** 또는 **"Resume"** 클릭
2. 프로젝트가 활성화될 때까지 대기 (몇 분 소요)
3. **브라우저 새로고침** 후 다시 로그인 시도

### 3단계: 브라우저 콘솔 확인

1. **F12** 또는 **Cmd+Option+I** (Mac)로 개발자 도구 열기
2. **Console 탭** 클릭
3. **로그인 시도** 후 다음 메시지 확인:
   - `✅ Supabase 연결 정보:` - 환경 변수가 올바르게 로드되었는지
   - `[SUPABASE LOGIN] 로그인 시도:`
   - `[SUPABASE LOGIN] 로그인 오류:` - 구체적인 오류 메시지

### 4단계: 환경 변수 확인

터미널에서:
```bash
cat .env.local
```

다음이 포함되어 있는지 확인:
```
VITE_SUPABASE_URL=https://twhnehyuikxgpoplohqm.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## 🔧 해결 방법

### 방법 1: 프로젝트 복원 (가장 가능성 높음)

프로젝트가 일시 중지되었다면:

1. **Supabase 대시보드 → 프로젝트 선택**
2. **"Restore"** 또는 **"Resume"** 클릭
3. 프로젝트가 활성화될 때까지 대기
4. **브라우저 새로고침** 후 다시 로그인

### 방법 2: 프로젝트 URL 업데이트

프로젝트 URL이 변경되었다면:

1. **Supabase 대시보드 → Settings → API**
2. **Project URL** 확인
3. **`.env.local` 파일 수정**:

```bash
VITE_SUPABASE_URL=https://올바른-프로젝트-ID.supabase.co
VITE_SUPABASE_ANON_KEY=올바른-API-키
```

4. **개발 서버 재시작**:
```bash
# 서버 중지 (Ctrl+C)
npm run dev
```

### 방법 3: 네트워크 문제 해결

1. **인터넷 연결 확인**
2. **VPN 끄기** (사용 중이라면)
3. **방화벽 확인** (회사 네트워크인 경우)
4. **다른 네트워크에서 테스트** (모바일 핫스팟 등)

## 📋 체크리스트

- [ ] Supabase 대시보드에서 프로젝트 상태 확인
- [ ] 프로젝트가 일시 중지되지 않았는지 확인
- [ ] 프로젝트 URL이 올바른지 확인
- [ ] `.env.local` 파일의 URL이 올바른지 확인
- [ ] 개발 서버 재시작
- [ ] 브라우저 완전히 새로고침 (Cmd+Shift+R)
- [ ] 브라우저 콘솔 오류 확인
- [ ] 인터넷 연결 확인

## 🆘 여전히 안 되는 경우

### 브라우저 콘솔 오류 확인

1. **F12** 또는 **Cmd+Option+I** (Mac)로 개발자 도구 열기
2. **Console 탭** 클릭
3. **로그인 시도** 후 오류 메시지 확인
4. **전체 오류 메시지 복사**하여 공유

### Supabase 로그 확인

1. **Supabase 대시보드 → Logs**
2. **API 로그** 확인
3. 오류 메시지 확인

### 네트워크 탭 확인

1. **개발자 도구 → Network 탭**
2. **로그인 시도**
3. **Supabase 요청** 확인
4. **상태 코드** 확인 (200, 404, 500 등)

## 💡 빠른 확인

브라우저 콘솔에서 다음을 실행:

```javascript
// Supabase 연결 확인
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has API Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

## 📞 추가 도움

문제가 계속되면:
1. **Supabase Support**: 대시보드 → Support
2. **프로젝트 로그**: Settings → Logs
3. **프로젝트 상태**: Dashboard에서 확인

