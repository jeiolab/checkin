import { parseISO, isWeekend } from 'date-fns';
import type { DayType, SemesterSchedule } from '../types';
import { getSemesterForDate } from './semester';

/**
 * 날짜의 유형 판단 (주중, 주말, 휴일, 방학)
 * 방학 기간 중 주중에만 방학 시간표 적용, 주말에는 주말 시간표 적용
 */
export const getDayType = (
  date: string,
  schedules: SemesterSchedule[],
  holidays: string[] = []
): DayType => {
  try {
    const dateObj = parseISO(date);
    
    // 휴일 확인
    if (holidays.includes(date)) {
      return 'holiday';
    }
    
    // 주말 확인 (방학 기간이든 아니든 주말이면 주말 시간표 사용)
    if (isWeekend(dateObj)) {
      return 'weekend';
    }
    
    // 방학 확인 (주중이면서 방학 기간이면 방학 시간표 사용)
    const semesterSchedule = getSemesterForDate(date, schedules);
    if (semesterSchedule && (semesterSchedule.type === '여름방학' || semesterSchedule.type === '겨울방학')) {
      return 'vacation';
    }
    
    // 주중
    return 'weekday';
  } catch {
    return 'weekday';
  }
};

/**
 * 날짜 유형 라벨
 */
export const getDayTypeLabel = (dayType: DayType): string => {
  const labels: Record<DayType, string> = {
    weekday: '주중',
    weekend: '주말',
    holiday: '휴일',
    vacation: '방학',
  };
  return labels[dayType];
};

