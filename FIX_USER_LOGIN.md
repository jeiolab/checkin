# 사용자 관리에서 등록한 계정 로그인 문제 해결

## 문제 진단

사용자 관리에서 계정을 등록했는데 로그인이 안 되는 경우, 다음을 확인하세요.

### 1. 브라우저 콘솔에서 사용자 확인

브라우저 개발자 도구(F12) → Console 탭에서 다음 코드 실행:

```javascript
(async () => {
  const { userStorage } = await import('/src/utils/storage.js');
  const users = await userStorage.load();
  
  console.log('=== 저장된 사용자 목록 ===');
  users.forEach((user, index) => {
    console.log(`[${index + 1}]`, {
      id: user.id,
      name: user.name,
      email: user.email || '(없음)',
      role: user.role,
      passwordHash: user.password ? user.password.substring(0, 50) + '...' : '❌ 비밀번호 없음',
      createdAt: user.createdAt
    });
  });
  
  console.log('\n=== 로그인 테스트 ===');
  // 등록한 사용자 정보로 테스트
  const testEmail = prompt('테스트할 이메일 또는 이름을 입력하세요:');
  const testPassword = prompt('테스트할 비밀번호를 입력하세요:');
  
  if (testEmail && testPassword) {
    const { login } = await import('/src/utils/auth.js');
    const result = await login(testEmail, testPassword);
    
    if (result) {
      console.log('✅ 로그인 성공!', result);
    } else {
      console.log('❌ 로그인 실패');
      
      // 사용자 찾기
      const foundUser = users.find(u => {
        const emailMatch = u.email && (u.email === testEmail || u.email.trim() === testEmail.trim());
        const nameMatch = u.name === testEmail || u.name.trim() === testEmail.trim();
        return emailMatch || nameMatch;
      });
      
      if (foundUser) {
        console.log('사용자 발견:', foundUser);
        console.log('비밀번호 해시 형식:', foundUser.password ? foundUser.password.substring(0, 30) : '없음');
      } else {
        console.log('⚠️ 사용자를 찾을 수 없습니다.');
        console.log('등록된 이름/이메일을 정확히 입력했는지 확인하세요.');
      }
    }
  }
})();
```

### 2. 사용자 계정 재생성

문제가 있는 사용자 계정을 삭제하고 다시 생성:

```javascript
(async () => {
  const { userStorage } = await import('/src/utils/storage.js');
  const { hashPassword } = await import('/src/utils/security.js');
  const { format } = await import('date-fns');
  
  const users = await userStorage.load();
  
  // 문제가 있는 사용자 찾기
  const targetEmail = prompt('삭제할 사용자의 이메일을 입력하세요 (없으면 이름 입력):');
  if (!targetEmail) return;
  
  const targetUser = users.find(u => 
    (u.email && u.email.trim() === targetEmail.trim()) || 
    u.name.trim() === targetEmail.trim()
  );
  
  if (!targetUser) {
    console.log('사용자를 찾을 수 없습니다.');
    return;
  }
  
  console.log('찾은 사용자:', targetUser);
  
  if (!confirm(`"${targetUser.name}" 사용자를 삭제하고 새로 생성하시겠습니까?`)) {
    return;
  }
  
  // 사용자 삭제
  const filteredUsers = users.filter(u => u.id !== targetUser.id);
  
  // 새 비밀번호 입력
  const newPassword = prompt('새 비밀번호를 입력하세요 (최소 8자, 영문/숫자/특수문자 중 2가지 이상):');
  if (!newPassword || newPassword.length < 8) {
    alert('비밀번호는 최소 8자 이상이어야 합니다.');
    return;
  }
  
  // 새 사용자 생성
  const newUser = {
    ...targetUser,
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    password: await hashPassword(newPassword),
    createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
  
  await userStorage.save([...filteredUsers, newUser]);
  console.log('✅ 사용자 계정이 재생성되었습니다!');
  console.log('이름:', newUser.name);
  console.log('이메일:', newUser.email || '(없음)');
  console.log('비밀번호:', newPassword);
  console.log('이제 로그인 페이지에서 로그인할 수 있습니다.');
})();
```

### 3. 모든 사용자 비밀번호 재설정

모든 사용자의 비밀번호를 재설정하려면:

```javascript
(async () => {
  const { userStorage } = await import('/src/utils/storage.js');
  const { hashPassword } = await import('/src/utils/security.js');
  
  const users = await userStorage.load();
  
  if (users.length === 0) {
    console.log('등록된 사용자가 없습니다.');
    return;
  }
  
  console.log('등록된 사용자:', users.map(u => ({ name: u.name, email: u.email })));
  
  const newPassword = prompt('모든 사용자에게 적용할 새 비밀번호를 입력하세요:');
  if (!newPassword) return;
  
  if (!confirm(`모든 사용자(${users.length}명)의 비밀번호를 "${newPassword}"로 변경하시겠습니까?`)) {
    return;
  }
  
  // 모든 사용자 비밀번호 재설정
  const updatedUsers = await Promise.all(users.map(async (user) => ({
    ...user,
    password: await hashPassword(newPassword)
  })));
  
  await userStorage.save(updatedUsers);
  console.log('✅ 모든 사용자의 비밀번호가 재설정되었습니다!');
  console.log('새 비밀번호:', newPassword);
})();
```

## 일반적인 문제 해결

### 문제 1: "사용자를 찾을 수 없습니다"
- **원인**: 이름이나 이메일이 정확히 일치하지 않음
- **해결**: 
  - 로그인 시 등록한 이름 또는 이메일을 정확히 입력
  - 공백이 있는지 확인
  - 대소문자 구분 확인

### 문제 2: "비밀번호가 올바르지 않습니다"
- **원인**: 비밀번호 해시가 잘못 생성되었거나 저장되지 않음
- **해결**: 
  - 위의 "사용자 계정 재생성" 코드 실행
  - 또는 사용자 관리에서 해당 사용자를 삭제하고 다시 생성

### 문제 3: "비밀번호 해시 형식 오류"
- **원인**: 비밀번호 해시가 올바른 형식이 아님
- **해결**: 
  - 위의 "모든 사용자 비밀번호 재설정" 코드 실행
  - 또는 localStorage를 초기화하고 처음부터 시작

## 로그인 시 주의사항

1. **이름으로 로그인**: 등록한 이름을 정확히 입력 (공백 포함)
2. **이메일로 로그인**: 등록한 이메일을 정확히 입력
3. **비밀번호**: 등록 시 입력한 비밀번호를 정확히 입력 (대소문자, 특수문자 포함)

## 디버깅 팁

브라우저 개발자 도구 → Application 탭 → Local Storage에서:
- `neungju_users` 키를 확인하여 사용자 데이터가 저장되었는지 확인
- 사용자 객체의 `password` 필드가 해시 형식(`pbkdf2_sha256_100000_...`)인지 확인

