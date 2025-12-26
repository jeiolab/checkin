// 브라우저 콘솔에서 실행하여 현재 설정 확인
// F12 -> Console 탭에 붙여넣기

console.log('=== 현재 설정 확인 ===');

// 1. 세션 ID 확인
const sessions = JSON.parse(localStorage.getItem('neungju_sessions') || '[]');
const activeSession = sessions.find(s => s.isActive);
console.log('활성 세션:', activeSession);

if (!activeSession) {
  console.error('활성 세션이 없습니다!');
} else {
  // 2. 설정 로드
  const sessionId = activeSession.id;
  const configKey = `neungju_attendance_config_${sessionId}`;
  const config = JSON.parse(localStorage.getItem(configKey) || 'null');
  
  console.log('설정 키:', configKey);
  console.log('전체 설정:', config);
  
  if (config && config.periodSchedules) {
    console.log('\n=== 교시 시간표 설정 ===');
    config.periodSchedules.forEach(ps => {
      console.log(`\n[${ps.dayType}]`);
      console.log(`  시작 교시: ${ps.startPeriod ?? 1}`);
      console.log(`  종료 교시: ${ps.endPeriod ?? '없음'}`);
      console.log(`  교시 개수: ${ps.periods?.length ?? 0}`);
      
      if (ps.dayType === 'weekday') {
        console.log(`\n  ⭐ 주중(weekday) 설정:`);
        console.log(`  시작: ${ps.startPeriod ?? 1}교시`);
        console.log(`  종료: ${ps.endPeriod ?? '없음'}교시`);
        if (ps.periods) {
          console.log(`  교시 시간표:`);
          ps.periods.forEach(p => {
            console.log(`    ${p.period}교시: ${p.startTime} ~ ${p.endTime}`);
          });
        }
      }
    });
  } else {
    console.warn('설정이 없거나 periodSchedules가 없습니다.');
  }
  
  // 3. 현재 날짜 확인
  const today = new Date().toISOString().split('T')[0];
  console.log('\n=== 오늘 날짜 ===');
  console.log('날짜:', today);
  
  // 4. 학기 일정 확인
  const schedules = JSON.parse(localStorage.getItem('neungju_semester_schedules') || '[]');
  console.log('\n=== 학기 일정 ===');
  schedules.forEach(s => {
    console.log(`${s.name}: ${s.startDate} ~ ${s.endDate}`);
  });
  
  // 5. 휴일 확인
  const holidays = JSON.parse(localStorage.getItem('neungju_holidays') || '[]');
  console.log('\n=== 휴일 ===');
  console.log('휴일 개수:', holidays.length);
  if (holidays.length > 0) {
    console.log('휴일 목록:', holidays.slice(0, 5));
  }
}

