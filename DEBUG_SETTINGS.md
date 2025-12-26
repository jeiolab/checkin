# 교시 시간 동기화 디버깅 가이드

## 문제 상황
설정 페이지에서 교시 시간을 변경했는데 출석부 탭의 시간과 동일하지 않습니다.

## 디버깅 방법

### 1. 브라우저 개발자 도구 열기
- F12 또는 Cmd+Option+I
- **Application** 탭 클릭
- 좌측 메뉴에서 **Local Storage** → 현재 도메인 선택

### 2. 설정 저장 확인
1. 설정 페이지에서 교시 시간 변경 (예: 평일 1교시 시작 시간을 08:30 → 09:00)
2. "전체 저장" 버튼 클릭
3. Application 탭에서 다음 키를 찾아보세요:
   - `neungju_attendance_config_[세션ID]` 형식의 키
4. 해당 키의 값을 클릭하여 JSON 확인
5. `periodSchedules` 배열에서 `dayType: "weekday"`인 항목의 `periods` 배열 확인
6. 1교시의 `startTime`이 "09:00"으로 저장되었는지 확인

### 3. 출석부에서 설정 로드 확인
1. 출석부 탭으로 이동
2. Console 탭에서 다음 로그 확인:
   - `📋 [출석부] 로드된 설정` - 설정이 제대로 로드되는지
   - `📋 [출석부] 날짜 유형` - 날짜 유형이 올바른지 (평일이면 'weekday')
   - `📋 [출석부] 찾은 설정` - 해당 날짜 유형의 설정을 찾았는지
   - `📋 [출석부] 마운트 시 교시 시간표 업데이트` - 교시 시간표가 업데이트되는지

### 4. 수동 확인 방법
브라우저 콘솔에서 다음 코드를 실행하여 직접 확인:

```javascript
// 1. 세션 ID 확인
const sessions = JSON.parse(localStorage.getItem('neungju_sessions') || '[]');
const activeSession = sessions.find(s => s.isActive);
console.log('활성 세션 ID:', activeSession?.id);

// 2. 설정 로드
const sessionId = activeSession?.id;
const configKey = `neungju_attendance_config_${sessionId}`;
const config = JSON.parse(localStorage.getItem(configKey) || 'null');
console.log('저장된 설정:', config);

// 3. 평일 설정 확인
if (config?.periodSchedules) {
  const weekdaySchedule = config.periodSchedules.find(ps => ps.dayType === 'weekday' && !ps.grade);
  console.log('평일 교시 시간표:', weekdaySchedule?.periods);
}

// 4. 현재 날짜의 날짜 유형 확인
const selectedDate = '2025-12-26'; // 현재 선택된 날짜로 변경
// 날짜 유형 확인 로직은 복잡하므로 콘솔 로그를 확인하세요
```

### 5. 문제 해결 체크리스트
- [ ] 설정이 localStorage에 제대로 저장되는가?
- [ ] 출석부에서 같은 세션 ID로 설정을 로드하는가?
- [ ] 날짜 유형(weekday/weekend/holiday/vacation)이 일치하는가?
- [ ] `periodSchedules` 배열에 해당 날짜 유형의 설정이 있는가?
- [ ] `grade` 필드가 없는 설정을 찾고 있는가? (`!ps.grade`)

## 예상 문제점
1. **세션 ID 불일치**: 설정 페이지와 출석부가 다른 세션 ID를 사용할 수 있음
2. **날짜 유형 불일치**: 설정한 날짜 유형과 출석부의 날짜 유형이 다를 수 있음
3. **설정이 저장되지 않음**: localStorage에 설정이 저장되지 않았을 수 있음
4. **설정이 로드되지 않음**: 출석부에서 설정을 로드하지 못할 수 있음

