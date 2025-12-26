// 관리자 계정 생성 스크립트
// 브라우저 콘솔에서 실행하세요

(async () => {
  try {
    // 동적 import (Vite 빌드 환경 대응)
    const storageModule = await import('/src/utils/storage.js');
    const securityModule = await import('/src/utils/security.js');
    const dateFnsModule = await import('date-fns');
    
    const { userStorage } = storageModule;
    const { hashPassword } = securityModule;
    const { format } = dateFnsModule;
    
    const users = await userStorage.load();
    
    // 이미 같은 이메일의 사용자가 있는지 확인
    const existingUser = users.find(u => u.email === 'ilsangsw@gmail.com');
    if (existingUser) {
      console.log('이미 같은 이메일의 사용자가 존재합니다:', existingUser.name);
      console.log('기존 사용자를 삭제하고 새로 생성하시겠습니까?');
      return;
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
    } catch (fallbackError) {
      console.error('대안 방법도 실패:', fallbackError);
      console.log('수동으로 생성하려면 SETUP_GUIDE.md를 참고하세요.');
    }
  }
})();

