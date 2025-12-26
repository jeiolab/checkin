import { format, parseISO, addDays, getDay } from 'date-fns';

/**
 * 한국의 고정 공휴일 목록 (YYYY-MM-DD 형식)
 */
const FIXED_HOLIDAYS: Record<string, string> = {
  '신정': '01-01',
  '삼일절': '03-01',
  '어린이날': '05-05',
  '현충일': '06-06',
  '광복절': '08-15',
  '개천절': '10-03',
  '한글날': '10-09',
  '크리스마스': '12-25',
};

/**
 * 특정 연도의 고정 공휴일 목록 반환
 */
export const getFixedHolidays = (year: number): string[] => {
  const holidays: string[] = [];
  
  Object.values(FIXED_HOLIDAYS).forEach(monthDay => {
    const date = `${year}-${monthDay}`;
    holidays.push(date);
  });
  
  return holidays.sort();
};

/**
 * 대체공휴일 계산 (일요일인 공휴일의 다음 월요일)
 */
export const getSubstituteHoliday = (date: string): string | null => {
  try {
    const dateObj = parseISO(date);
    const dayOfWeek = getDay(dateObj); // 0 = 일요일, 1 = 월요일, ...
    
    // 일요일이면 다음 월요일이 대체공휴일
    if (dayOfWeek === 0) {
      return format(addDays(dateObj, 1), 'yyyy-MM-dd');
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * 특정 연도의 한국 공휴일 목록 반환 (고정 공휴일 + 대체공휴일)
 */
export const getKoreanHolidays = (year: number): string[] => {
  const holidays = new Set<string>();
  
  // 고정 공휴일 추가
  const fixedHolidays = getFixedHolidays(year);
  fixedHolidays.forEach(holiday => {
    holidays.add(holiday);
    
    // 대체공휴일 확인 (일요일인 경우)
    const substitute = getSubstituteHoliday(holiday);
    if (substitute) {
      holidays.add(substitute);
    }
  });
  
  return Array.from(holidays).sort();
};

/**
 * 여러 연도의 공휴일을 한 번에 가져오기
 */
export const getKoreanHolidaysForYears = (startYear: number, endYear: number): string[] => {
  const holidays = new Set<string>();
  
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getKoreanHolidays(year);
    yearHolidays.forEach(holiday => holidays.add(holiday));
  }
  
  return Array.from(holidays).sort();
};

/**
 * 공휴일 이름 가져오기
 */
export const getHolidayName = (date: string): string => {
  try {
    const dateObj = parseISO(date);
    const monthDay = format(dateObj, 'MM-dd');
    
    // 고정 공휴일 확인
    for (const [name, md] of Object.entries(FIXED_HOLIDAYS)) {
      if (md === monthDay) {
        // 대체공휴일인지 확인
        const dayOfWeek = getDay(dateObj);
        if (dayOfWeek === 1) {
          // 월요일이고 전날이 일요일인지 확인
          const prevDay = format(addDays(dateObj, -1), 'MM-dd');
          if (prevDay === md) {
            return `${name} 대체공휴일`;
          }
        }
        return name;
      }
    }
    
    return format(dateObj, 'MM월 dd일');
  } catch {
    return date;
  }
};

