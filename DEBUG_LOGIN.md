# 로그인 문제 해결 가이드

## 문제 진단

로그인이 되지 않는 경우 다음을 확인하세요:

### 1. 브라우저 콘솔에서 사용자 계정 확인

브라우저 개발자 도구(F12)를 열고 Console 탭에서 다음 코드를 실행:

```javascript
(async () => {
  const { userStorage } = await import('/src/utils/storage.js');
  const users = await userStorage.load();
  console.log('저장된 사용자:', users);
  console.log('사용자 수:', users.length);
  
  if (users.length > 0) {
    users.forEach(user => {
      console.log('사용자:', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash: user.password ? user.password.substring(0, 30) + '...' : '없음'
      });
    });
  } else {
    console.log('⚠️ 사용자 계정이 없습니다. 관리자 계정을 생성해야 합니다.');
  }
})();
```

### 2. 관리자 계정 수동 생성

사용자 계정이 없거나 잘못된 경우, 다음 코드로 관리자 계정을 생성:

```javascript
(async () => {
  try {
    const { userStorage } = await import('/src/utils/storage.js');
    const { hashPassword } = await import('/src/utils/security.js');
    const { format } = await import('date-fns');
    
    const users = await userStorage.load();
    
    // 기존 관리자 계정 확인
    const existingAdmin = users.find(u => u.email === 'ilsangsw@gmail.com' || u.name === '관리자');
    if (existingAdmin) {
      console.log('기존 관리자 계정 발견:', existingAdmin);
      if (!confirm('기존 관리자 계정을 삭제하고 새로 생성하시겠습니까?')) {
        return;
      }
      const filteredUsers = users.filter(u => u.id !== existingAdmin.id);
      users.splice(0, users.length, ...filteredUsers);
    }
    
    // 관리자 계정 생성
    const adminUser = {
      id: `admin-${Date.now()}`,
      name: '관리자',
      role: 'admin',
      email: 'ilsangsw@gmail.com',
      password: await hashPassword('flqjvnf@81'),
      createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    };
    
    await userStorage.save([...users, adminUser]);
    console.log('✅ 관리자 계정이 생성되었습니다!');
    console.log('이메일: ilsangsw@gmail.com');
    console.log('비밀번호: flqjvnf@81');
    console.log('이제 로그인 페이지에서 로그인할 수 있습니다.');
  } catch (error) {
    console.error('오류 발생:', error);
    
    // 대안: localStorage에 직접 저장
    try {
      const { hashPassword } = await import('/src/utils/security.js');
      const { format } = await import('date-fns');
      
      const existingData = localStorage.getItem('neungju_users');
      const existingUsers = existingData ? JSON.parse(existingData) : [];
      
      const adminUser = {
        id: `admin-${Date.now()}`,
        name: '관리자',
        role: 'admin',
        email: 'ilsangsw@gmail.com',
        password: await hashPassword('flqjvnf@81'),
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      };
      
      localStorage.setItem('neungju_users', JSON.stringify([...existingUsers, adminUser]));
      console.log('✅ 관리자 계정이 localStorage에 직접 저장되었습니다!');
      console.log('페이지를 새로고침한 후 로그인하세요.');
    } catch (fallbackError) {
      console.error('대안 방법도 실패:', fallbackError);
    }
  }
})();
```

### 3. 로그인 테스트

계정 생성 후 다음 코드로 로그인을 테스트:

```javascript
(async () => {
  const { login } = await import('/src/utils/auth.js');
  
  console.log('로그인 테스트 시작...');
  const result = await login('ilsangsw@gmail.com', 'flqjvnf@81');
  
  if (result) {
    console.log('✅ 로그인 성공!', result);
  } else {
    console.log('❌ 로그인 실패');
    
    // 사용자 확인
    const { userStorage } = await import('/src/utils/storage.js');
    const users = await userStorage.load();
    const user = users.find(u => u.email === 'ilsangsw@gmail.com' || u.name === '관리자');
    
    if (user) {
      console.log('사용자 발견:', user);
      console.log('비밀번호 해시:', user.password);
    } else {
      console.log('사용자를 찾을 수 없습니다.');
    }
  }
})();
```

### 4. localStorage 초기화 (최후의 수단)

모든 데이터를 초기화하고 처음부터 시작:

```javascript
// ⚠️ 주의: 이 작업은 모든 데이터를 삭제합니다!
if (confirm('모든 데이터를 삭제하고 처음부터 시작하시겠습니까?')) {
  localStorage.clear();
  console.log('✅ localStorage가 초기화되었습니다.');
  console.log('페이지를 새로고침하면 관리자 계정이 자동으로 생성됩니다.');
  location.reload();
}
```

## 일반적인 문제 해결

### 문제 1: "사용자 계정이 없습니다"
- 위의 "관리자 계정 수동 생성" 코드를 실행하세요.

### 문제 2: "비밀번호가 올바르지 않습니다"
- 비밀번호 해시가 잘못 생성되었을 수 있습니다.
- 위의 "관리자 계정 수동 생성" 코드를 다시 실행하여 계정을 재생성하세요.

### 문제 3: "로그인 중 오류가 발생했습니다"
- 브라우저 콘솔에서 오류 메시지를 확인하세요.
- 네트워크 탭에서 실패한 요청이 있는지 확인하세요.

## 로그인 정보

- **이메일**: ilsangsw@gmail.com
- **이름**: 관리자
- **비밀번호**: flqjvnf@81

