// 사용자 역할 타입
export type UserRole = 
  | 'admin'        // 교감/관리자 교사 (모든 수정 권한)
  | 'teacher'      // 담임 교사 (모든 수정 권한)
  | 'subject_teacher' // 교과 교사 (해당 교시/구역 체크 권한)
  | 'student_monitor'; // 학생(반장) (임시 체크 권한, 최종 승인 필요)

// 권한 타입
export type Permission = 
  | 'view_all'           // 전체 조회
  | 'edit_all'           // 전체 수정
  | 'edit_attendance'     // 출석 수정
  | 'edit_students'      // 학생 정보 수정
  | 'edit_settings'      // 설정 수정
  | 'check_attendance'  // 출석 체크 (임시)
  | 'approve_attendance' // 출석 승인
  | 'view_reports';      // 리포트 조회

// 사용자 정보
export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  grade?: Grade; // 담임인 경우
  class?: Class; // 담임인 경우
  subject?: string; // 교과 교사인 경우
  studentId?: string; // 학생(반장)인 경우
  password?: string; // 비밀번호 (해시)
  createdAt: string;
  lastLogin?: string;
}

// 임시 출석 체크 (학생 반장이 체크한 것)
export interface PendingAttendance {
  id: string;
  studentId: string;
  date: string;
  period: number;
  status: AttendanceStatus;
  checkedBy: string; // 체크한 사용자 ID
  checkedAt: string;
  approvedBy?: string; // 승인한 교사 ID
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  note?: string;
}

// 출석 상태 타입
export type AttendanceStatus = 
  | 'present'      // 출석
  | 'absent'       // 결석
  | 'late'         // 지각
  | 'early_leave'  // 조퇴
  | 'leave'        // 외출
  | 'sick'         // 병결
  | 'home_school'  // 홈스쿨링 (결석률 미포함)
  | 'home_return'; // 귀가

// 학기 타입
export type Semester = '1학기' | '2학기' | '여름방학' | '겨울방학';

// 세션 (Session) - 학기 단위 관리
export interface Session {
  id: string; // 세션 고유 ID (예: "2024-1학기")
  name: string; // 세션 이름 (예: "2024년 1학기")
  type: Semester; // 학기 타입
  startDate: string; // YYYY-MM-DD 형식
  endDate: string; // YYYY-MM-DD 형식
  year: number; // 연도
  isActive: boolean; // 활성 세션 여부
  createdAt: string; // 생성일시
  archivedAt?: string; // 아카이빙 일시
}

// 학기/방학 일정 (하위 호환성 유지)
export interface SemesterSchedule {
  id: string;
  name: string; // 학기/방학 이름 (예: "2024년 1학기", "2024년 여름방학")
  type: Semester; // 학기 타입
  startDate: string; // YYYY-MM-DD 형식
  endDate: string; // YYYY-MM-DD 형식
  year: number; // 연도
}

// 학년 타입
export type Grade = 1 | 2 | 3;

// 반 타입
export type Class = 1 | 2 | 3 | 4 | 5 | 6;

// 학생 정보
export interface Student {
  id: string;
  name: string;
  grade: Grade;
  class: Class;
  number: number; // 번호
  isHomeSchool?: boolean; // 홈스쿨링 여부
  homeSchoolStartDate?: string; // 홈스쿨링 시작일
  homeSchoolEndDate?: string; // 홈스쿨링 종료일
  isHomeReturn?: boolean; // 귀가 여부 (자율학습 안하고 집으로 가는 경우)
  homeReturnStartPeriod?: number; // 귀가 시작 교시 (1~12)
  isFriendshipClass?: boolean; // 우정반 여부
}

// 날짜 유형
export type DayType = 'weekday' | 'weekend' | 'holiday' | 'vacation';

// 교시 정보
export interface Period {
  period: number; // 1~12
  startTime: string; // HH:mm 형식
  endTime: string; // HH:mm 형식
}

// 날짜 유형별 교시 시간표
export interface PeriodSchedule {
  dayType: DayType;
  periods: Period[];
  startPeriod?: number; // 시작 교시 (기본값: 1)
  endPeriod?: number; // 종료 교시 (기본값: periods의 최대값)
  grade?: Grade; // 학년 (없으면 모든 학년에 적용)
}

// 출석 기록
export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD 형식
  period: number;
  status: AttendanceStatus;
  note?: string; // 비고
  sessionId?: string; // 세션 ID (세션별 분리)
}

// 일별 교시 범위 설정
export interface DayPeriodRange {
  date: string; // YYYY-MM-DD 형식
  startPeriod: number; // 시작 교시 (1~12)
  endPeriod: number; // 종료 교시 (1~12)
}

// 출석부 설정
export interface AttendanceConfig {
  semester: Semester;
  grade: Grade;
  class: Class;
  dayPeriodRanges: DayPeriodRange[]; // 날짜별 교시 범위
  periodSchedules: PeriodSchedule[]; // 날짜 유형별 교시 시간표
  defaultPeriods?: Period[]; // 기본 교시 시간표 (하위 호환성)
  sessionId?: string; // 세션 ID (세션별 분리)
}

// 출석 통계
export interface AttendanceStats {
  studentId: string;
  totalPeriods: number; // 전체 교시 수
  present: number; // 출석
  absent: number; // 결석 (홈스쿨링 제외)
  late: number; // 지각
  earlyLeave: number; // 조퇴
  leave: number; // 외출
  sick: number; // 병결
  homeSchool: number; // 홈스쿨링
  homeReturn: number; // 귀가
  attendanceRate: number; // 출석률 (홈스쿨링 제외)
}

// 주간 리포트 인사이트
export interface WeeklyInsight {
  type: 'warning' | 'info' | 'positive'; // 경고, 정보, 긍정
  message: string; // 인사이트 메시지
  grade?: Grade; // 학년
  class?: Class; // 반
  metric?: string; // 지표 (예: 'late_rate', 'absent_rate')
  change?: number; // 변화율 (%)
}

// 우선순위 알림 (관심 필요 학생)
export interface PriorityAlert {
  id: string;
  studentId: string;
  studentName: string;
  grade: Grade;
  class: Class;
  priority: 'high' | 'medium' | 'low'; // high: 즉시 상담 필요, medium: 주의 관찰, low: 참고
  category: 'repeated_late' | 'health_issue' | 'night_study_absence' | 'absent_accumulation' | 'home_school_return' | 'other';
  title: string;
  description: string;
  recommendation: string;
  data?: {
    // 반복 지각
    repeatedDays?: string[]; // ['월', '화']
    period?: number;
    // 양호실 방문
    healthVisitCount?: number;
    // 야간 자율학습 이탈
    nightStudyAbsenceDays?: string[];
    // 결석 누적
    absentDays?: number;
    attendanceRate?: number;
    // 홈스쿨링
    homeSchoolEndDate?: string;
  };
}

// 생활 패턴 분석
export interface PatternAnalysis {
  dayOfWeekPattern: {
    day: string; // '월', '화', ...
    lateRate: number;
    earlyLeaveRate: number;
    absentRate: number;
  }[];
  periodPattern: {
    period: number;
    absentRate: number;
    earlyLeaveRate: number;
    healthVisitRate: number;
  }[];
  insights: {
    fatigueDay?: string; // 가장 피로한 요일
    concentrationPeriod?: number; // 집중도가 낮은 교시
    healthIssuePeriod?: number; // 양호실 방문이 많은 교시
  };
}

// 홈스쿨링 및 장기 결석자 관리
export interface HomeSchoolAlert {
  studentId: string;
  studentName: string;
  grade: Grade;
  class: Class;
  type: 'home_school_return' | 'absent_warning';
  message: string;
  daysRemaining?: number; // 홈스쿨링 종료까지 남은 일수
  attendanceRate?: number; // 출석률
  absentDays?: number; // 결석 일수
  requiredAttendanceRate?: number; // 수료 기준 출석률 (보통 2/3 = 66.7%)
  riskLevel?: 'high' | 'medium' | 'low';
}

// 주간 리포트
export interface WeeklyReport {
  id: string; // 리포트 ID (예: "2024-W01")
  weekStartDate: string; // 주 시작일 (월요일, YYYY-MM-DD)
  weekEndDate: string; // 주 종료일 (일요일, YYYY-MM-DD)
  generatedAt: string; // 생성일시
  gradeStats: Record<string, GradeWeeklyStats>; // 학년별 통계 (key: "1", "2", "3")
  classStats: Record<string, ClassWeeklyStats>; // 반별 통계 (key: "1-1", "1-2", ...)
  insights: WeeklyInsight[]; // AI 인사이트
  priorityAlerts: PriorityAlert[]; // 관심 필요 학생 우선순위화
  patternAnalysis: PatternAnalysis; // 생활 리듬 & 학습 분위기 분석
  homeSchoolAlerts: HomeSchoolAlert[]; // 홈스쿨링 및 장기 결석자 관리
}

// 학년별 주간 통계
export interface GradeWeeklyStats {
  grade: Grade;
  totalStudents: number;
  totalPeriods: number;
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  leave: number;
  sick: number;
  homeSchool: number;
  homeReturn: number;
  attendanceRate: number; // 출석률
  lateRate: number; // 지각률
  absentRate: number; // 결석률
}

// 반별 주간 통계
export interface ClassWeeklyStats {
  grade: Grade;
  class: Class;
  totalStudents: number;
  totalPeriods: number;
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  leave: number;
  sick: number;
  homeSchool: number;
  homeReturn: number;
  attendanceRate: number;
  lateRate: number;
  absentRate: number;
  previousWeekStats?: ClassWeeklyStats; // 전주 통계 (비교용)
  previousMonthStats?: ClassWeeklyStats; // 전월 통계 (비교용)
}

