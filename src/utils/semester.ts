import { parseISO, isWithinInterval } from 'date-fns';
import type { SemesterSchedule } from '../types';

/**
 * 특정 날짜가 속한 학기/방학 일정 찾기
 */
export const getSemesterForDate = (
  date: string,
  schedules: SemesterSchedule[]
): SemesterSchedule | null => {
  try {
    const checkDate = parseISO(date);
    
    for (const schedule of schedules) {
      const startDate = parseISO(schedule.startDate);
      const endDate = parseISO(schedule.endDate);
      
      if (isWithinInterval(checkDate, { start: startDate, end: endDate })) {
        return schedule;
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * 학기/방학 일정을 이름으로 정렬 (연도, 타입 순)
 */
export const sortSchedules = (schedules: SemesterSchedule[]): SemesterSchedule[] => {
  return [...schedules].sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    
    const typeOrder: Record<string, number> = {
      '1학기': 1,
      '여름방학': 2,
      '2학기': 3,
      '겨울방학': 4,
    };
    
    return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
  });
};

