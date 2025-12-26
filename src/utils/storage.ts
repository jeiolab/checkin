import type { Student, AttendanceRecord, AttendanceConfig, SemesterSchedule, Session, WeeklyReport, User, PendingAttendance } from '../types';
import { createSession } from './session';
import { hashPassword } from './security';
import { format } from 'date-fns';

const STORAGE_KEYS = {
  STUDENTS: 'neungju_students',
  ATTENDANCE_RECORDS: 'neungju_attendance_records',
  ATTENDANCE_CONFIG: 'neungju_attendance_config',
  SEMESTER_SCHEDULES: 'neungju_semester_schedules',
  HOLIDAYS: 'neungju_holidays',
  SESSIONS: 'neungju_sessions',
  ARCHIVED_RECORDS: 'neungju_archived_records',
  ARCHIVED_CONFIGS: 'neungju_archived_configs',
  WEEKLY_REPORTS: 'neungju_weekly_reports',
  USERS: 'neungju_users',
  CURRENT_USER: 'neungju_current_user',
  PENDING_ATTENDANCE: 'neungju_pending_attendance',
} as const;

// 안전한 JSON 파싱 (보안 강화)
const safeJsonParse = <T>(data: string, defaultValue: T): T => {
  try {
    if (!data || typeof data !== 'string') return defaultValue;
    const parsed = JSON.parse(data);
    // 기본 타입 검증
    if (typeof parsed !== 'object' || parsed === null) return defaultValue;
    return parsed as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
};

// null을 허용하는 안전한 JSON 파싱
const safeJsonParseNullable = <T>(data: string, defaultValue: T | null): T | null => {
  try {
    if (!data || typeof data !== 'string') return defaultValue;
    const parsed = JSON.parse(data);
    // 기본 타입 검증
    if (typeof parsed !== 'object' || parsed === null) return defaultValue;
    return parsed as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
};

// 학생 데이터 저장/로드
export const studentStorage = {
  save: (students: Student[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch (error) {
      console.error('Failed to save students:', error);
    }
  },
  load: (): Student[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (!data) return [];
      return safeJsonParse<Student[]>(data, []);
    } catch (error) {
      console.error('Failed to load students:', error);
      return [];
    }
  },
};

// 출석 기록 저장/로드 (세션별)
export const attendanceStorage = {
  save: (records: AttendanceRecord[], sessionId?: string) => {
    if (sessionId) {
      // 세션별로 저장
      const key = `${STORAGE_KEYS.ATTENDANCE_RECORDS}_${sessionId}`;
      localStorage.setItem(key, JSON.stringify(records));
    } else {
      // 기본 저장 (하위 호환성)
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(records));
    }
  },
  load: (sessionId?: string): AttendanceRecord[] => {
    if (sessionId) {
      // 세션별로 로드
      const key = `${STORAGE_KEYS.ATTENDANCE_RECORDS}_${sessionId}`;
      const data = localStorage.getItem(key);
      return data ? safeJsonParse<AttendanceRecord[]>(data, []) : [];
    } else {
      // 기본 로드 (하위 호환성)
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS);
      return data ? safeJsonParse<AttendanceRecord[]>(data, []) : [];
    }
  },
  // 모든 세션의 기록 로드
  loadAll: (): AttendanceRecord[] => {
    const allRecords: AttendanceRecord[] = [];
    // 기본 기록
    const defaultData = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS);
    if (defaultData) {
      const parsed = safeJsonParse<AttendanceRecord[]>(defaultData, []);
      allRecords.push(...parsed);
    }
    // 세션별 기록
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_KEYS.ATTENDANCE_RECORDS}_`)) {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = safeJsonParse<AttendanceRecord[]>(data, []);
          allRecords.push(...parsed);
        }
      }
    }
    return allRecords;
  },
};

// 출석부 설정 저장/로드 (세션별)
export const configStorage = {
  save: (config: AttendanceConfig, sessionId?: string) => {
    if (sessionId) {
      // 세션별로 저장
      const key = `${STORAGE_KEYS.ATTENDANCE_CONFIG}_${sessionId}`;
      localStorage.setItem(key, JSON.stringify(config));
    } else {
      // 기본 저장 (하위 호환성)
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_CONFIG, JSON.stringify(config));
    }
  },
  load: (sessionId?: string): AttendanceConfig | null => {
    try {
      if (sessionId) {
        // 세션별로 로드
        const key = `${STORAGE_KEYS.ATTENDANCE_CONFIG}_${sessionId}`;
        const data = localStorage.getItem(key);
        return data ? safeJsonParseNullable<AttendanceConfig>(data, null) : null;
      } else {
        // 기본 로드 (하위 호환성)
        const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_CONFIG);
        return data ? safeJsonParseNullable<AttendanceConfig>(data, null) : null;
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      return null;
    }
  },
};

// 학기/방학 일정 저장/로드
export const semesterScheduleStorage = {
  save: (schedules: SemesterSchedule[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SEMESTER_SCHEDULES, JSON.stringify(schedules));
    } catch (error) {
      console.error('Failed to save schedules:', error);
    }
  },
  load: (): SemesterSchedule[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEMESTER_SCHEDULES);
      return data ? safeJsonParse<SemesterSchedule[]>(data, []) : [];
    } catch (error) {
      console.error('Failed to load schedules:', error);
      return [];
    }
  },
};

// 휴일 저장/로드
export const holidayStorage = {
  save: (holidays: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
    } catch (error) {
      console.error('Failed to save holidays:', error);
    }
  },
  load: (): string[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
      return data ? safeJsonParse<string[]>(data, []) : [];
    } catch (error) {
      console.error('Failed to load holidays:', error);
      return [];
    }
  },
};

// 세션 저장/로드
export const sessionStorage = {
  save: (sessions: Session[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  },
  load: (): Session[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return data ? safeJsonParse<Session[]>(data, []) : [];
    } catch (error) {
      console.error('Failed to load sessions:', error);
      return [];
    }
  },
};

// 아카이빙된 기록 저장/로드
export const archivedRecordsStorage = {
  save: (sessionId: string, records: AttendanceRecord[]) => {
    try {
      const key = `${STORAGE_KEYS.ARCHIVED_RECORDS}_${sessionId}`;
      localStorage.setItem(key, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save archived records:', error);
    }
  },
  load: (sessionId: string): AttendanceRecord[] => {
    try {
      const key = `${STORAGE_KEYS.ARCHIVED_RECORDS}_${sessionId}`;
      const data = localStorage.getItem(key);
      return data ? safeJsonParse<AttendanceRecord[]>(data, []) : [];
    } catch (error) {
      console.error('Failed to load archived records:', error);
      return [];
    }
  },
  loadAll: (): Record<string, AttendanceRecord[]> => {
    const archived: Record<string, AttendanceRecord[]> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${STORAGE_KEYS.ARCHIVED_RECORDS}_`)) {
          const sessionId = key.replace(`${STORAGE_KEYS.ARCHIVED_RECORDS}_`, '');
          const data = localStorage.getItem(key);
          if (data) {
            archived[sessionId] = safeJsonParse<AttendanceRecord[]>(data, []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load all archived records:', error);
    }
    return archived;
  },
};

// 아카이빙된 설정 저장/로드
export const archivedConfigsStorage = {
  save: (sessionId: string, config: AttendanceConfig) => {
    try {
      const key = `${STORAGE_KEYS.ARCHIVED_CONFIGS}_${sessionId}`;
      localStorage.setItem(key, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save archived config:', error);
    }
  },
  load: (sessionId: string): AttendanceConfig | null => {
    try {
      const key = `${STORAGE_KEYS.ARCHIVED_CONFIGS}_${sessionId}`;
      const data = localStorage.getItem(key);
      return data ? safeJsonParseNullable<AttendanceConfig>(data, null) : null;
    } catch (error) {
      console.error('Failed to load archived config:', error);
      return null;
    }
  },
  loadAll: (): Record<string, AttendanceConfig> => {
    const archived: Record<string, AttendanceConfig> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${STORAGE_KEYS.ARCHIVED_CONFIGS}_`)) {
          const sessionId = key.replace(`${STORAGE_KEYS.ARCHIVED_CONFIGS}_`, '');
          const data = localStorage.getItem(key);
          if (data) {
            const config = safeJsonParseNullable<AttendanceConfig>(data, null);
            if (config) {
              archived[sessionId] = config;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load all archived configs:', error);
    }
    return archived;
  },
};

// 초기 데이터 생성 (샘플)
export const initializeSampleData = async () => {
  const students = studentStorage.load();
  if (students.length === 0) {
    const sampleStudents: Student[] = [];
    for (let grade = 1; grade <= 3; grade++) {
      for (let classNum = 1; classNum <= 6; classNum++) {
        for (let num = 1; num <= 30; num++) {
          sampleStudents.push({
            id: `${grade}-${classNum}-${num}`,
            name: `${grade}학년 ${classNum}반 ${num}번`,
            grade: grade as 1 | 2 | 3,
            class: classNum as 1 | 2 | 3 | 4 | 5 | 6,
            number: num,
            isHomeSchool: false,
            isHomeReturn: false,
            isFriendshipClass: false,
          });
        }
      }
    }
    studentStorage.save(sampleStudents);
  }

  // 기본 학기 일정 생성 (없을 경우)
  const schedules = semesterScheduleStorage.load();
  if (schedules.length === 0) {
    const currentYear = new Date().getFullYear();
    const defaultSchedules: SemesterSchedule[] = [
      {
        id: `${currentYear}-1학기`,
        name: `${currentYear}년 1학기`,
        type: '1학기',
        startDate: `${currentYear}-03-01`,
        endDate: `${currentYear}-06-30`,
        year: currentYear,
      },
      {
        id: `${currentYear}-여름방학`,
        name: `${currentYear}년 여름방학`,
        type: '여름방학',
        startDate: `${currentYear}-07-01`,
        endDate: `${currentYear}-08-31`,
        year: currentYear,
      },
      {
        id: `${currentYear}-2학기`,
        name: `${currentYear}년 2학기`,
        type: '2학기',
        startDate: `${currentYear}-09-01`,
        endDate: `${currentYear}-12-31`,
        year: currentYear,
      },
      {
        id: `${currentYear + 1}-겨울방학`,
        name: `${currentYear + 1}년 겨울방학`,
        type: '겨울방학',
        startDate: `${currentYear + 1}-01-01`,
        endDate: `${currentYear + 1}-02-28`,
        year: currentYear + 1,
      },
    ];
    semesterScheduleStorage.save(defaultSchedules);
  }

  // 기본 세션 생성 (없을 경우)
  const sessions = sessionStorage.load();
  if (sessions.length === 0) {
    const currentYear = new Date().getFullYear();
    const defaultSessions: Session[] = [
      createSession(
        `${currentYear}년 1학기`,
        '1학기',
        `${currentYear}-03-01`,
        `${currentYear}-06-30`,
        currentYear
      ),
      createSession(
        `${currentYear}년 여름방학`,
        '여름방학',
        `${currentYear}-07-01`,
        `${currentYear}-08-31`,
        currentYear
      ),
      createSession(
        `${currentYear}년 2학기`,
        '2학기',
        `${currentYear}-09-01`,
        `${currentYear}-12-31`,
        currentYear
      ),
      createSession(
        `${currentYear + 1}년 겨울방학`,
        '겨울방학',
        `${currentYear + 1}-01-01`,
        `${currentYear + 1}-02-28`,
        currentYear + 1
      ),
    ];
    // 첫 번째 세션을 활성으로 설정
    defaultSessions[0].isActive = true;
    sessionStorage.save(defaultSessions);
  }

  // 기본 관리자 계정 생성 (없을 경우)
  const users = await userStorage.load();
  if (users.length === 0) {
    const adminUser: User = {
      id: `admin-${Date.now()}`,
      name: '관리자',
      role: 'admin',
      email: 'ilsangsw@gmail.com',
      password: await hashPassword('flqjvnf@81'),
      createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    };
    
    await userStorage.save([adminUser]);
  }
};

// 주간 리포트 저장/로드
export const weeklyReportStorage = {
  save: (reports: WeeklyReport[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.WEEKLY_REPORTS, JSON.stringify(reports));
    } catch (error) {
      console.error('Failed to save weekly reports:', error);
    }
  },
  load: (): WeeklyReport[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WEEKLY_REPORTS);
      return data ? safeJsonParse<WeeklyReport[]>(data, []) : [];
    } catch (error) {
      console.error('Failed to load weekly reports:', error);
      return [];
    }
  },
};

// 사용자 저장/로드 (성능 최적화: 암호화 비활성화, 필요시 활성화 가능)
export const userStorage = {
  save: async (users: User[]) => {
    try {
      // 성능 최적화: 암호화 비활성화
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  },
  load: async (): Promise<User[]> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!data) return [];
      return safeJsonParse<User[]>(data, []);
    } catch (error) {
      console.error('Failed to load user data:', error);
      return [];
    }
  },
};

// 현재 로그인한 사용자 (암호화 - 성능 최적화: 암호화 비활성화)
export const currentUserStorage = {
  save: async (user: User | null) => {
    if (user) {
      try {
        // 비밀번호 제거 후 저장
        const safeUser = { ...user };
        delete (safeUser as any).password;
        // 성능 최적화: 암호화 비활성화 (필요시 활성화 가능)
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser));
      } catch (error) {
        console.error('Failed to save current user:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },
  load: async (): Promise<User | null> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!data) return null;
      
      // 성능 최적화: 암호화 비활성화
      return safeJsonParseNullable<User>(data, null);
    } catch (error) {
      console.error('Failed to load current user:', error);
      return null;
    }
  },
};

// 임시 출석 체크 저장/로드
export const pendingAttendanceStorage = {
  save: (pending: PendingAttendance[]) => {
    localStorage.setItem(STORAGE_KEYS.PENDING_ATTENDANCE, JSON.stringify(pending));
  },
  load: (): PendingAttendance[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_ATTENDANCE);
      return data ? safeJsonParse<PendingAttendance[]>(data, []) : [];
    } catch (error) {
      console.error('Failed to load pending attendance:', error);
      return [];
    }
  },
};

