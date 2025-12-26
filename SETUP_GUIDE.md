# 시스템 초기 설정 가이드

## 초기 관리자 계정 생성

시스템을 처음 사용할 때는 관리자 계정을 생성해야 합니다.

### 방법 1: 브라우저 콘솔을 통한 계정 생성

1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭 선택
3. 다음 코드 실행:

```javascript
// 관리자 계정 생성
(async () => {
  const { userStorage } = await import('./src/utils/storage');
  const { hashPassword } = await import('./src/utils/security');
  const { format } = await import('date-fns');
  
  const users = await userStorage.load();
  
  // 이미 사용자가 있으면 생성하지 않음
  if (users.length > 0) {
    console.log('이미 사용자가 존재합니다.');
    return;
  }
  
  const adminUser = {
    id: `admin-${Date.now()}`,
    name: '관리자',
    role: 'admin',
    password: await hashPassword('초기비밀번호를여기에입력하세요'), // 반드시 변경하세요!
    createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
  
  await userStorage.save([adminUser]);
  console.log('관리자 계정이 생성되었습니다.');
  console.log('이름: 관리자');
  console.log('비밀번호: 초기비밀번호를여기에입력하세요');
  console.log('⚠️ 반드시 로그인 후 비밀번호를 변경하세요!');
})();
```

4. 로그인 후 즉시 비밀번호 변경 (헤더의 열쇠 아이콘 클릭)

### 방법 2: UserManagement 페이지를 통한 계정 생성 (권장)

**주의**: 이 방법은 이미 관리자 계정이 있는 경우에만 사용 가능합니다.

1. 관리자 계정으로 로그인
2. "사용자 관리" 탭으로 이동
3. "사용자 추가" 버튼 클릭
4. 다음 정보 입력:
   - 이름: 원하는 관리자 이름
   - 역할: 관리자
   - 비밀번호: 강력한 비밀번호 (최소 8자, 영문/숫자/특수문자 중 2가지 이상)
   - 이메일: (선택사항)

## 보안 권장사항

### 비밀번호 정책
- 최소 8자 이상
- 영문, 숫자, 특수문자 중 최소 2가지 이상 포함
- 일반적인 약한 비밀번호 패턴 사용 금지 (예: 12345678, password 등)

### 계정 관리
- 정기적으로 비밀번호 변경 (3-6개월마다 권장)
- 각 사용자에게 고유한 비밀번호 설정
- 관리자 계정은 특히 강력한 비밀번호 사용

### 초기 설정 후 필수 작업
1. ✅ 관리자 계정 생성
2. ✅ 관리자 비밀번호 변경 (강력한 비밀번호로)
3. ✅ 필요한 사용자 계정 생성
4. ✅ 각 사용자에게 비밀번호 안내 및 초기 변경 요청

## 문제 해결

### 계정이 없어서 로그인할 수 없는 경우
위의 "방법 1: 브라우저 콘솔을 통한 계정 생성"을 사용하여 관리자 계정을 생성하세요.

### 비밀번호를 잊어버린 경우
현재는 비밀번호 재설정 기능이 없습니다. 관리자에게 문의하거나, 브라우저의 localStorage를 초기화한 후 새로 계정을 생성해야 합니다.

**localStorage 초기화 방법:**
1. 브라우저 개발자 도구 열기 (F12)
2. Application 탭 (Chrome) 또는 Storage 탭 (Firefox) 선택
3. Local Storage에서 해당 도메인 선택
4. `neungju_users` 키 삭제
5. 페이지 새로고침 후 위의 계정 생성 방법 사용

