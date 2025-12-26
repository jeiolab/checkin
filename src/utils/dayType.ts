import { parseISO, isWeekend } from 'date-fns';
import type { DayType, SemesterSchedule } from '../types';
import { getSemesterForDate } from './semester';

/**
 * 날짜의 유형 판단 (주중, 주말, 휴일, 방학)
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
    
    // 방학 확인
    const semesterSchedule = getSemesterForDate(date, schedules);
    if (semesterSchedule && (semesterSchedule.type === '여름방학' || semesterSchedule.type === '겨울방학')) {
      return 'vacation';
    }
    
    // 주말 확인
    if (isWeekend(dateObj)) {
      return 'weekend';
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

