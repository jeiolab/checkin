import { format, parseISO, isWithinInterval } from 'date-fns';
import type { Session, Semester, SemesterSchedule } from '../types';

/**
 * 세션 생성
 */
export const createSession = (
  name: string,
  type: Semester,
  startDate: string,
  endDate: string,
  year: number
): Session => {
  return {
    id: `${year}-${type}`,
    name,
    type,
    startDate,
    endDate,
    year,
    isActive: true,
    createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
};

/**
 * 세션을 SemesterSchedule로 변환 (하위 호환성)
 */
export const sessionToSemesterSchedule = (session: Session): SemesterSchedule => {
  return {
    id: session.id,
    name: session.name,
    type: session.type,
    startDate: session.startDate,
    endDate: session.endDate,
    year: session.year,
  };
};

/**
 * SemesterSchedule을 Session으로 변환
 */
export const semesterScheduleToSession = (schedule: SemesterSchedule): Session => {
  return {
    id: schedule.id,
    name: schedule.name,
    type: schedule.type,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    year: schedule.year,
    isActive: true,
    createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
};

/**
 * 날짜가 세션 기간 내에 있는지 확인
 */
export const isDateInSession = (date: string, session: Session): boolean => {
  try {
    const checkDate = parseISO(date);
    const startDate = parseISO(session.startDate);
    const endDate = parseISO(session.endDate);
    
    return isWithinInterval(checkDate, { start: startDate, end: endDate });
  } catch {
    return false;
  }
};

/**
 * 특정 날짜에 해당하는 세션 찾기
 */
export const getSessionForDate = (date: string, sessions: Session[]): Session | null => {
  return sessions.find(session => isDateInSession(date, session)) || null;
};

/**
 * 활성 세션 찾기
 */
export const getActiveSession = (sessions: Session[]): Session | null => {
  return sessions.find(session => session.isActive) || null;
};

/**
 * 세션 정렬 (최신순)
 */
export const sortSessions = (sessions: Session[]): Session[] => {
  return [...sessions].sort((a, b) => {
    // 활성 세션이 먼저
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    
    // 연도와 학기 순서로 정렬
    if (a.year !== b.year) return b.year - a.year;
    
    const order: Record<Semester, number> = {
      '1학기': 1,
      '여름방학': 2,
      '2학기': 3,
      '겨울방학': 4,
    };
    
    return order[a.type] - order[b.type];
  });
};

/**
 * 세션 아카이빙
 */
export const archiveSession = (session: Session): Session => {
  return {
    ...session,
    isActive: false,
    archivedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
};

