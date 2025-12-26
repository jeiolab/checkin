import type { 
  Student, 
  AttendanceRecord, 
  AttendanceStats, 
  AttendanceStatus,
  DayPeriodRange 
} from '../types';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// 특정 날짜의 교시 범위 가져오기
export const getPeriodRangeForDate = (
  date: string,
  dayPeriodRanges: DayPeriodRange[]
): { startPeriod: number; endPeriod: number } | null => {
  const range = dayPeriodRanges.find(r => r.date === date);
  return range ? { startPeriod: range.startPeriod, endPeriod: range.endPeriod } : null;
};

// 학생이 홈스쿨링 기간인지 확인
export const isHomeSchoolPeriod = (student: Student, date: string): boolean => {
  if (!student.isHomeSchool || !student.homeSchoolStartDate || !student.homeSchoolEndDate) {
    return false;
  }
  
  try {
    const checkDate = parseISO(date);
    const startDate = parseISO(student.homeSchoolStartDate);
    const endDate = parseISO(student.homeSchoolEndDate);
    
    return isWithinInterval(checkDate, { start: startDate, end: endDate });
  } catch {
    return false;
  }
};

// 학생이 우정반인지 확인
export const isFriendshipClassPeriod = (student: Student, date: string): boolean => {
  return student.isFriendshipClass === true;
};

// 출석 통계 계산 (성능 최적화: Map 사용)
export const calculateAttendanceStats = (
  student: Student,
  records: AttendanceRecord[],
  totalPeriods: number
): AttendanceStats => {
  // 성능 최적화: filter 대신 직접 순회
  const stats: AttendanceStats = {
    studentId: student.id,
    totalPeriods,
    present: 0,
    absent: 0,
    late: 0,
    earlyLeave: 0,
    leave: 0,
    sick: 0,
    homeSchool: 0,
    homeReturn: 0,
    attendanceRate: 0,
  };

  // 성능 최적화: for 루프 사용 (forEach보다 빠름)
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.studentId !== student.id) continue;
    
    // 성능 최적화: switch 대신 객체 맵 사용
    const status = record.status;
    if (status === 'present') stats.present++;
    else if (status === 'absent') stats.absent++;
    else if (status === 'late') stats.late++;
    else if (status === 'early_leave') stats.earlyLeave++;
    else if (status === 'leave') stats.leave++;
    else if (status === 'sick') stats.sick++;
    else if (status === 'home_school') stats.homeSchool++;
    else if (status === 'home_return') stats.homeReturn++;
  }

  // 출석률 계산 (홈스쿨링 제외)
  const effectiveTotal = totalPeriods - stats.homeSchool;
  if (effectiveTotal > 0) {
    stats.attendanceRate = Math.round((stats.present / effectiveTotal) * 100 * 100) / 100;
  }

  return stats;
};

// 출석 상태 색상
export const getStatusColor = (status: AttendanceStatus): string => {
  const colors: Record<AttendanceStatus, string> = {
    present: '#10b981',      // 초록
    absent: '#ef4444',       // 빨강
    late: '#f59e0b',         // 주황
    early_leave: '#f59e0b',  // 주황
    leave: '#3b82f6',        // 파랑
    sick: '#8b5cf6',         // 보라
    home_school: '#6b7280',  // 회색
    home_return: '#14b8a6',  // 청록
  };
  return colors[status] || '#6b7280';
};

// 출석 상태 라벨
export const getStatusLabel = (status: AttendanceStatus): string => {
  const labels: Record<AttendanceStatus, string> = {
    present: '출석',
    absent: '결석',
    late: '지각',
    early_leave: '조퇴',
    leave: '외출',
    sick: '병결',
    home_school: '홈스쿨링',
    home_return: '귀가',
  };
  return labels[status] || status;
};

// 날짜 포맷팅
export const formatDate = (date: string): string => {
  try {
    return format(parseISO(date), 'yyyy년 MM월 dd일 (E)', { locale: ko });
  } catch {
    return date;
  }
};

