# 관리자 계정 생성 가이드

## 브라우저 콘솔에서 실행

1. 애플리케이션을 열고 브라우저 개발자 도구를 엽니다 (F12)
2. Console 탭을 선택합니다
3. 다음 코드를 복사하여 붙여넣고 Enter를 누릅니다:

```javascript
(async () => {
  try {
    // 모듈 동적 로드
    const { userStorage } = await import('/src/utils/storage.js');
    const { hashPassword } = await import('/src/utils/security.js');
    const { format } = await import('date-fns');
    
    const users = await userStorage.load();
    
    // 이미 같은 이메일의 사용자가 있는지 확인
    const existingUser = users.find(u => u.email === 'ilsangsw@gmail.com');
    if (existingUser) {
      console.log('⚠️ 이미 같은 이메일의 사용자가 존재합니다:', existingUser.name);
      if (!confirm('기존 사용자를 삭제하고 새로 생성하시겠습니까?')) {
        return;
      }
      // 기존 사용자 제거
      const filteredUsers = users.filter(u => u.id !== existingUser.id);
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
    console.log('대안: localStorage에 직접 저장하는 방법을 시도합니다...');
    
    // 대안: localStorage에 직접 저장
    try {
      const { hashPassword } = await import('/src/utils/security.js');
      const { format } = await import('date-fns');
      
      const existingData = localStorage.getItem('neungju_users');
      const existingUsers = existingData ? JSON.parse(existingData) : [];
      
      // 기존 사용자 확인
      const existingUser = existingUsers.find(u => u.email === 'ilsangsw@gmail.com');
      if (existingUser) {
        if (!confirm('이미 같은 이메일의 사용자가 있습니다. 덮어쓰시겠습니까?')) {
          return;
        }
        const filteredUsers = existingUsers.filter(u => u.id !== existingUser.id);
        existingUsers.splice(0, existingUsers.length, ...filteredUsers);
      }
      
      const adminUser = {
        id: `admin-${Date.now()}`,
        name: '관리자',
        role: 'admin',
        email: 'ilsangsw@gmail.com',
        password: await hashPassword('flqjvnf@81'),
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      };
      
      localStorage.setItem('neungju_users', JSON.stringify([...existingUsers, adminUser]));
      console.log('✅ 관리자 계정이 생성되었습니다!');
      console.log('이메일: ilsangsw@gmail.com');
      console.log('비밀번호: flqjvnf@81');
      console.log('페이지를 새로고침한 후 로그인하세요.');
    } catch (fallbackError) {
      console.error('대안 방법도 실패:', fallbackError);
      console.log('수동으로 생성하려면 SETUP_GUIDE.md를 참고하세요.');
    }
  }
})();
```

## 로그인 정보

- **이메일**: ilsangsw@gmail.com
- **비밀번호**: flqjvnf@81

## 주의사항

1. 로그인 후 즉시 비밀번호를 변경하는 것을 권장합니다
2. 이 스크립트는 개발/초기 설정용입니다
3. 프로덕션 환경에서는 보안을 위해 다른 방법을 사용하세요


