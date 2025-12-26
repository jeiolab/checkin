# 빈 화면 문제 해결 가이드

## 🔍 문제 진단

### 1단계: 브라우저 콘솔 확인

1. **F12** 또는 **Cmd+Option+I** (Mac)로 개발자 도구 열기
2. **Console 탭** 클릭
3. 다음 메시지들을 확인:
   - `[APP] 초기화 시작`
   - `[APP] 샘플 데이터 초기화 완료`
   - `[APP] 현재 사용자:`
   - `[APP] 초기화 완료, 로딩 상태 해제`
   - **오류 메시지가 있는지 확인**

### 2단계: 네트워크 탭 확인

1. **개발자 도구 → Network 탭**
2. **페이지 새로고침** (Cmd+R 또는 F5)
3. 다음 요청들이 성공하는지 확인:
   - `/src/main.tsx` - 200 OK
   - `/src/App.tsx` - 200 OK
   - Supabase 요청들 - 200 OK 또는 오류 확인

### 3단계: 일반적인 문제와 해결

#### 문제 1: "로딩 중..."에서 멈춤

**원인**: `getCurrentUser()`가 실패하거나 무한 대기

**해결**:
1. 브라우저 콘솔에서 오류 메시지 확인
2. Supabase 연결 상태 확인
3. `.env.local` 파일에 Supabase URL과 키가 올바르게 설정되어 있는지 확인

#### 문제 2: Supabase 연결 오류

**증상**: 콘솔에 `Failed to fetch` 또는 `ERR_NAME_NOT_RESOLVED` 오류

**해결**:
1. `.env.local` 파일 확인:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
2. Supabase 프로젝트가 일시 중지되지 않았는지 확인
3. 네트워크 연결 확인

#### 문제 3: 초기화 오류

**증상**: 콘솔에 `[APP] 초기화 오류:` 메시지

**해결**:
1. 오류 메시지 전체 내용 확인
2. `initializeSampleData()` 함수 확인
3. localStorage 접근 권한 확인

#### 문제 4: React 렌더링 오류

**증상**: 콘솔에 React 관련 오류

**해결**:
1. 오류 메시지 전체 내용 확인
2. 브라우저 캐시 삭제 후 다시 시도
3. 개발 서버 재시작

### 4단계: 강제 새로고침

1. **브라우저 완전히 새로고침**: Cmd+Shift+R (Mac) 또는 Ctrl+Shift+R (Windows)
2. 또는 **브라우저 캐시 삭제** 후 다시 접속

### 5단계: 개발 서버 재시작

```bash
# 서버 중지 (Ctrl+C)
npm run dev
```

## 🔧 추가 디버깅

브라우저 콘솔에서 다음을 실행:

```javascript
// Supabase 연결 확인
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has API Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// localStorage 확인
console.log('LocalStorage:', localStorage);
console.log('SessionStorage:', sessionStorage);

// React 앱 확인
console.log('Root element:', document.getElementById('root'));
```

## 📋 체크리스트

- [ ] 브라우저 콘솔 오류 확인
- [ ] 네트워크 탭에서 요청 상태 확인
- [ ] Supabase 연결 상태 확인
- [ ] `.env.local` 파일 확인
- [ ] 브라우저 완전 새로고침
- [ ] 개발 서버 재시작
- [ ] 다른 브라우저에서 테스트

## 🆘 문제가 계속되면

1. **브라우저 콘솔의 전체 오류 메시지** 복사
2. **Network 탭의 실패한 요청** 확인
3. **Supabase 로그** 확인 (Settings → Logs)

