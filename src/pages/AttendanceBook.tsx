import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, getYear, getMonth } from 'date-fns';
import { CheckSquare, Trash2, AlertCircle, CheckCircle2, XCircle, Printer, Eye, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { studentStorage, attendanceStorage, configStorage, globalPeriodSchedulesStorage, semesterScheduleStorage, holidayStorage, sessionStorage } from '../utils/storage';
import { getSemesterForDate, sortSchedules } from '../utils/semester';
import { getDayType, getDayTypeLabel } from '../utils/dayType';
import { getActiveSession, getSessionForDate } from '../utils/session';
import { getCurrentUser, canEditAttendance, canApproveAttendance } from '../utils/auth-supabase';
import { approvePendingAttendance, rejectPendingAttendance, getPendingAttendances } from '../utils/pendingAttendance';
import type { Student, AttendanceRecord, Period, AttendanceStatus, SemesterSchedule, PendingAttendance, User, AttendanceConfig } from '../types';
import { isHomeSchoolPeriod, isFriendshipClassPeriod, getStatusColor, getStatusLabel } from '../utils/attendance';
import './AttendanceBook.css';

export default function AttendanceBook() {
  const [semester, setSemester] = useState<'1학기' | '2학기' | '여름방학' | '겨울방학'>('1학기');
  const [grade, setGrade] = useState<1 | 2 | 3>(1);
  const [classNum, setClassNum] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const getWeekdayKorean = (date: string): string => {
    const weekdayMap: Record<string, string> = {
      'Monday': '월요일',
      'Tuesday': '화요일',
      'Wednesday': '수요일',
      'Thursday': '목요일',
      'Friday': '금요일',
      'Saturday': '토요일',
      'Sunday': '일요일',
    };
    const weekday = format(parseISO(date), 'EEEE');
    return weekdayMap[weekday] || weekday;
  };
  const [startPeriod, setStartPeriod] = useState(1);
  const [endPeriod, setEndPeriod] = useState(12);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [schedules, setSchedules] = useState<SemesterSchedule[]>([]);
  const [bulkPeriod, setBulkPeriod] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingAttendances, setPendingAttendances] = useState<PendingAttendance[]>([]);
  const [showPendingPanel, setShowPendingPanel] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const loadPeriodsForDate = useCallback((date: string, config: AttendanceConfig | null, schedules: SemesterSchedule[]) => {
    console.log('🔄 [loadPeriodsForDate] 호출', { date, config, schedules });
    const holidays = holidayStorage.load();
    const dayType = getDayType(date, schedules, holidays);
    console.log('🔄 [loadPeriodsForDate] 날짜 유형', dayType);
    
    // 전역 교시 시간 설정 우선 사용
    const globalPeriodSchedules = globalPeriodSchedulesStorage.load();
    let periodSchedulesToUse = config?.periodSchedules;
    
    if (globalPeriodSchedules && globalPeriodSchedules.length > 0) {
      console.log('🔄 [loadPeriodsForDate] 전역 교시 시간 설정 사용', globalPeriodSchedules);
      periodSchedulesToUse = globalPeriodSchedules;
    } else if (config && config.periodSchedules && config.periodSchedules.length > 0) {
      console.log('🔄 [loadPeriodsForDate] 세션별 교시 시간 설정 사용', config.periodSchedules);
      periodSchedulesToUse = config.periodSchedules;
    }
    
    if (periodSchedulesToUse && periodSchedulesToUse.length > 0) {
      // 공통 설정 사용 (학년별 설정 제거)
      const schedule = periodSchedulesToUse.find(ps => ps.dayType === dayType && !ps.grade);
      console.log('🔄 [loadPeriodsForDate] 찾은 설정', schedule);
      
      if (schedule) {
        console.log('🔄 [loadPeriodsForDate] 교시 시간표 업데이트', schedule.periods);
        setPeriods(schedule.periods);
        // 교시 범위 설정 - 설정에서 지정한 값 사용
        const maxPeriod = Math.max(...schedule.periods.map(p => p.period));
        // startPeriod와 endPeriod가 명시적으로 설정되어 있으면 사용, 없으면 기본값
        const newStartPeriod = schedule.startPeriod ?? 1;
        const newEndPeriod = schedule.endPeriod ?? maxPeriod;
        console.log('🔄 [loadPeriodsForDate] 교시 범위 업데이트', { 
          newStartPeriod, 
          newEndPeriod,
          scheduleStartPeriod: schedule.startPeriod,
          scheduleEndPeriod: schedule.endPeriod,
          hasStartPeriod: schedule.startPeriod !== undefined,
          hasEndPeriod: schedule.endPeriod !== undefined,
          maxPeriod,
          dayType
        });
        setStartPeriod(newStartPeriod);
        setEndPeriod(newEndPeriod);
        return;
      }
    }
    
    // 하위 호환성: defaultPeriods 사용
    if (config?.defaultPeriods) {
      setPeriods(config.defaultPeriods);
      const maxPeriod = Math.max(...config.defaultPeriods.map(p => p.period));
      setStartPeriod(1);
      setEndPeriod(maxPeriod);
    } else {
      // 기본값
      const defaultPeriods: Period[] = [
        { period: 1, startTime: '08:30', endTime: '09:20' },
        { period: 2, startTime: '09:30', endTime: '10:20' },
        { period: 3, startTime: '10:30', endTime: '11:20' },
        { period: 4, startTime: '11:30', endTime: '12:20' },
        { period: 5, startTime: '13:20', endTime: '14:10' },
        { period: 6, startTime: '14:20', endTime: '15:10' },
        { period: 7, startTime: '15:20', endTime: '16:10' },
        { period: 8, startTime: '16:20', endTime: '17:10' },
        { period: 9, startTime: '19:00', endTime: '19:50' },
        { period: 10, startTime: '20:00', endTime: '20:50' },
        { period: 11, startTime: '21:00', endTime: '21:50' },
        { period: 12, startTime: '22:00', endTime: '22:50' },
      ];
      setPeriods(defaultPeriods);
      setStartPeriod(1);
      setEndPeriod(12);
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
    loadData();
    loadPendingAttendances();
  }, [semester, grade, classNum]);

  // schedules가 로드된 후 설정 로드
  useEffect(() => {
    if (schedules.length === 0) return; // schedules가 로드될 때까지 대기
    
    // 출석부 탭으로 이동할 때마다 최신 설정 로드
    console.log('📋 [출석부] 컴포넌트 마운트 - 설정 다시 로드', { schedulesLength: schedules.length });
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
    const sessionId = currentSession?.id;
    console.log('📋 [출석부] 세션 정보', { sessionId, selectedDate });
    
    const config = configStorage.load(sessionId);
    console.log('📋 [출석부] 로드된 설정', config);
    
    if (config && config.periodSchedules && config.periodSchedules.length > 0) {
      const holidays = holidayStorage.load();
      const dayType = getDayType(selectedDate, schedules, holidays);
      console.log('📋 [출석부] 날짜 유형', dayType);
      
      const schedule = config.periodSchedules.find(ps => ps.dayType === dayType && !ps.grade);
      console.log('📋 [출석부] 찾은 설정', schedule);
      
      if (schedule) {
        console.log('📋 [출석부] 마운트 시 교시 시간표 업데이트', schedule.periods);
        setPeriods(schedule.periods);
        const maxPeriod = Math.max(...schedule.periods.map(p => p.period));
        const newStartPeriod = schedule.startPeriod ?? 1;
        const newEndPeriod = schedule.endPeriod ?? maxPeriod;
        console.log('📋 [출석부] 교시 범위 업데이트', { newStartPeriod, newEndPeriod });
        setStartPeriod(newStartPeriod);
        setEndPeriod(newEndPeriod);
      } else {
        console.warn('⚠️ [출석부] 해당 dayType의 설정을 찾을 수 없음', { dayType, periodSchedules: config.periodSchedules });
      }
    } else {
      console.warn('⚠️ [출석부] 설정이 없거나 periodSchedules가 비어있음', { config });
    }
  }, [schedules, selectedDate]);

  // 설정 변경 이벤트 리스너 추가
  useEffect(() => {
    const handleConfigUpdate = (event?: Event) => {
      console.log('📥 [출석부] 설정 업데이트 이벤트 수신', event);
      // 설정이 변경되면 현재 날짜의 교시 시간표 다시 로드
      const customEvent = event as CustomEvent;
      const eventSessionId = customEvent?.detail?.sessionId;
      const eventConfig = customEvent?.detail?.config;
      
      // 항상 최신 데이터 로드
      const sessions = sessionStorage.load();
      const activeSession = getActiveSession(sessions);
      const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
      const targetSessionId = eventSessionId || currentSession?.id;
      
      console.log('📥 [출석부] 세션 정보', { eventSessionId, targetSessionId, selectedDate });
      
      // 전역 교시 시간 설정 우선 확인
      const globalPeriodSchedules = globalPeriodSchedulesStorage.load();
      console.log('📥 [출석부] 전역 교시 시간 설정', globalPeriodSchedules);
      
      if (globalPeriodSchedules && globalPeriodSchedules.length > 0) {
        const weekdaySchedule = globalPeriodSchedules.find(ps => ps.dayType === 'weekday' && !ps.grade);
        if (weekdaySchedule) {
          console.log('📥 [출석부] 전역 설정의 주중(weekday) 정보:', {
            startPeriod: weekdaySchedule.startPeriod,
            endPeriod: weekdaySchedule.endPeriod,
            hasStartPeriod: weekdaySchedule.startPeriod !== undefined,
            hasEndPeriod: weekdaySchedule.endPeriod !== undefined,
            periodsCount: weekdaySchedule.periods.length
          });
        }
      }
      
      // 이벤트에서 전달된 config를 우선 사용, 없으면 localStorage에서 로드
      let config = eventConfig || configStorage.load(targetSessionId);
      
      // 전역 설정이 있으면 config에 병합
      if (globalPeriodSchedules && globalPeriodSchedules.length > 0) {
        if (config) {
          config = {
            ...config,
            periodSchedules: globalPeriodSchedules,
          };
          console.log('📥 [출석부] 전역 설정을 config에 병합 완료');
        } else {
          // config가 없으면 전역 설정만으로 구성
          config = {
            semester: '1학기',
            grade: 1,
            class: 1,
            dayPeriodRanges: [],
            periodSchedules: globalPeriodSchedules,
            sessionId: targetSessionId || '',
          };
          console.log('📥 [출석부] 전역 설정만으로 config 생성');
        }
      }
      
      console.log('📥 [출석부] 최종 설정', config);
      
      // schedules를 직접 로드하여 사용 (상태 의존성 제거)
      const loadedSchedules = sortSchedules(semesterScheduleStorage.load());
      
      if (loadedSchedules.length > 0 && config) {
        console.log('📥 [출석부] loadPeriodsForDate 호출', { selectedDate, config, schedulesLength: loadedSchedules.length });
        loadPeriodsForDate(selectedDate, config, loadedSchedules);
      } else if (loadedSchedules.length === 0) {
        console.warn('⚠️ [출석부] schedules가 아직 로드되지 않음');
      } else {
        console.warn('⚠️ [출석부] 설정이 없음');
      }
    };

    const handleHolidaysUpdate = () => {
      // 휴일이 변경되면 날짜 유형이 바뀔 수 있으므로 교시 시간표 다시 로드
      if (schedules.length > 0) {
        const sessions = sessionStorage.load();
        const activeSession = getActiveSession(sessions);
        const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
        const sessionId = currentSession?.id;
        
        const config = configStorage.load(sessionId);
        if (config) {
          loadPeriodsForDate(selectedDate, config, schedules);
        } else {
          // 설정이 없으면 기본값으로 다시 설정
          const holidays = holidayStorage.load();
          const dayType = getDayType(selectedDate, schedules, holidays);
          const defaultPeriods: Period[] = [
            { period: 1, startTime: '08:30', endTime: '09:20' },
            { period: 2, startTime: '09:30', endTime: '10:20' },
            { period: 3, startTime: '10:30', endTime: '11:20' },
            { period: 4, startTime: '11:30', endTime: '12:20' },
            { period: 5, startTime: '13:20', endTime: '14:10' },
            { period: 6, startTime: '14:20', endTime: '15:10' },
            { period: 7, startTime: '15:20', endTime: '16:10' },
            { period: 8, startTime: '16:20', endTime: '17:10' },
            { period: 9, startTime: '19:00', endTime: '19:50' },
            { period: 10, startTime: '20:00', endTime: '20:50' },
            { period: 11, startTime: '21:00', endTime: '21:50' },
            { period: 12, startTime: '22:00', endTime: '22:50' },
          ];
          setPeriods(defaultPeriods);
          if (dayType === 'weekend') {
            setStartPeriod(1);
            setEndPeriod(8);
          } else if (dayType === 'holiday') {
            setStartPeriod(1);
            setEndPeriod(6);
          } else if (dayType === 'vacation') {
            setStartPeriod(1);
            setEndPeriod(4);
          } else {
            setStartPeriod(1);
            setEndPeriod(12);
          }
        }
      }
    };

    const handleSemesterScheduleUpdate = () => {
      // 학기 일정이 변경되면 날짜 유형과 학기 선택이 바뀔 수 있으므로 다시 로드
      const loadedSchedules = sortSchedules(semesterScheduleStorage.load());
      setSchedules(loadedSchedules);
      
      // 날짜에 맞는 학기 자동 선택
      const matchedSchedule = getSemesterForDate(selectedDate, loadedSchedules);
      if (matchedSchedule && matchedSchedule.type !== semester) {
        setSemester(matchedSchedule.type);
      }
      
      // 교시 시간표 다시 로드
      if (loadedSchedules.length > 0) {
        const sessions = sessionStorage.load();
        const activeSession = getActiveSession(sessions);
        const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
        const sessionId = currentSession?.id;
        
        const config = configStorage.load(sessionId);
        if (config) {
          loadPeriodsForDate(selectedDate, config, loadedSchedules);
        }
      }
    };

    const handleSessionUpdate = () => {
      // 세션이 변경되면 데이터 다시 로드
      loadData();
      
      // 교시 시간표 다시 로드
      if (schedules.length > 0) {
        const sessions = sessionStorage.load();
        const activeSession = getActiveSession(sessions);
        const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
        const sessionId = currentSession?.id;
        
        const config = configStorage.load(sessionId);
        if (config) {
          loadPeriodsForDate(selectedDate, config, schedules);
        }
      }
    };

    console.log('📡 [출석부] 이벤트 리스너 등록 시작');
    window.addEventListener('attendanceConfigUpdated', handleConfigUpdate as EventListener);
    window.addEventListener('holidaysUpdated', handleHolidaysUpdate);
    window.addEventListener('semesterScheduleUpdated', handleSemesterScheduleUpdate);
    window.addEventListener('sessionUpdated', handleSessionUpdate);
    console.log('📡 [출석부] 이벤트 리스너 등록 완료');
    
    return () => {
      window.removeEventListener('attendanceConfigUpdated', handleConfigUpdate as EventListener);
      window.removeEventListener('holidaysUpdated', handleHolidaysUpdate);
      window.removeEventListener('semesterScheduleUpdated', handleSemesterScheduleUpdate);
      window.removeEventListener('sessionUpdated', handleSessionUpdate);
    };
  }, [selectedDate, schedules, loadPeriodsForDate]);

  const loadPendingAttendances = () => {
    const pending = getPendingAttendances();
    setPendingAttendances(pending);
  };

  useEffect(() => {
    // 선택된 날짜에 맞는 학기/방학 자동 선택
    const schedules = semesterScheduleStorage.load();
    const matchedSchedule = getSemesterForDate(selectedDate, schedules);
    if (matchedSchedule && matchedSchedule.type !== semester) {
      setSemester(matchedSchedule.type);
    }
  }, [selectedDate]);



  const loadData = () => {
    const allStudents = studentStorage.load();
    const filtered = allStudents.filter(s => s.grade === grade && s.class === classNum);
    setStudents(filtered.sort((a, b) => a.number - b.number));

    // 활성 세션 확인
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
    
    // 세션별 출석 기록 로드
    if (currentSession) {
      const sessionRecords = attendanceStorage.load(currentSession.id);
      setRecords(sessionRecords);
    } else {
      // 세션이 없으면 기본 로드 (하위 호환성)
      const allRecords = attendanceStorage.load();
      setRecords(allRecords);
    }

    // 학기/방학 일정 로드
    const loadedSchedules = sortSchedules(semesterScheduleStorage.load());
    setSchedules(loadedSchedules);

    // 세션별 설정 로드
    const sessionId = currentSession?.id;
    const config = configStorage.load(sessionId);
    // 설정이 있으면 사용 (학년/반 조건 완화 - 교시 범위는 공통으로 사용)
    if (config) {
      // 날짜 유형에 맞는 교시 시간표 로드
      loadPeriodsForDate(selectedDate, config, loadedSchedules);
    } else {
      // 기본 교시 시간 설정
      const defaultPeriods: Period[] = [
        { period: 1, startTime: '08:30', endTime: '09:20' },
        { period: 2, startTime: '09:30', endTime: '10:20' },
        { period: 3, startTime: '10:30', endTime: '11:20' },
        { period: 4, startTime: '11:30', endTime: '12:20' },
        { period: 5, startTime: '13:20', endTime: '14:10' },
        { period: 6, startTime: '14:20', endTime: '15:10' },
        { period: 7, startTime: '15:20', endTime: '16:10' },
        { period: 8, startTime: '16:20', endTime: '17:10' },
        { period: 9, startTime: '19:00', endTime: '19:50' },
        { period: 10, startTime: '20:00', endTime: '20:50' },
        { period: 11, startTime: '21:00', endTime: '21:50' },
        { period: 12, startTime: '22:00', endTime: '22:50' },
      ];
      setPeriods(defaultPeriods);
      // 날짜 유형에 따라 기본 교시 범위 설정
      const holidays = holidayStorage.load();
      const dayType = getDayType(selectedDate, loadedSchedules, holidays);
      if (dayType === 'weekend') {
        setStartPeriod(1);
        setEndPeriod(8);
      } else if (dayType === 'holiday') {
        setStartPeriod(1);
        setEndPeriod(6);
      } else if (dayType === 'vacation') {
        setStartPeriod(1);
        setEndPeriod(4);
      } else {
        setStartPeriod(1);
        setEndPeriod(12);
      }
    }
  };

  useEffect(() => {
    // 날짜가 변경되면 해당 날짜의 교시 시간표 로드
    // 세션별 설정 로드
    if (schedules.length === 0) return; // schedules가 로드될 때까지 대기
    
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
    const sessionId = currentSession?.id;
    
    const config = configStorage.load(sessionId);
    // 설정이 있으면 사용 (학년/반 조건 완화 - 교시 범위는 공통으로 사용)
    if (config) {
      loadPeriodsForDate(selectedDate, config, schedules);
    } else {
      // 설정이 없으면 기본값으로 설정
      const holidays = holidayStorage.load();
      const dayType = getDayType(selectedDate, schedules, holidays);
      // 기본 교시 범위 설정 (설정이 없을 때)
      const defaultPeriods: Period[] = [
        { period: 1, startTime: '08:30', endTime: '09:20' },
        { period: 2, startTime: '09:30', endTime: '10:20' },
        { period: 3, startTime: '10:30', endTime: '11:20' },
        { period: 4, startTime: '11:30', endTime: '12:20' },
        { period: 5, startTime: '13:20', endTime: '14:10' },
        { period: 6, startTime: '14:20', endTime: '15:10' },
        { period: 7, startTime: '15:20', endTime: '16:10' },
        { period: 8, startTime: '16:20', endTime: '17:10' },
        { period: 9, startTime: '19:00', endTime: '19:50' },
        { period: 10, startTime: '20:00', endTime: '20:50' },
        { period: 11, startTime: '21:00', endTime: '21:50' },
        { period: 12, startTime: '22:00', endTime: '22:50' },
      ];
      setPeriods(defaultPeriods);
      // 날짜 유형에 따라 기본 교시 범위 설정
      if (dayType === 'weekend') {
        setStartPeriod(1);
        setEndPeriod(8);
      } else if (dayType === 'holiday') {
        setStartPeriod(1);
        setEndPeriod(6);
      } else if (dayType === 'vacation') {
        setStartPeriod(1);
        setEndPeriod(4);
      } else {
        setStartPeriod(1);
        setEndPeriod(12);
      }
    }
  }, [selectedDate, semester, grade, classNum, schedules]);

  // getAttendanceStatus 메모이제이션 (성능 최적화)
  const getAttendanceStatus = useCallback((studentId: string, period: number): AttendanceStatus | null => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    // 먼저 기존 기록 확인
    const record = records.find(
      r => r.studentId === studentId && r.date === selectedDate && r.period === period
    );
    if (record) return record.status;

    // 홈스쿨링 기간이면 자동으로 홈스쿨링 상태
    if (isHomeSchoolPeriod(student, selectedDate)) {
      return 'home_school';
    }

    // 귀가 학생이고 귀가 시작 교시 이후면 자동으로 귀가 상태
    if (student.isHomeReturn && student.homeReturnStartPeriod && period >= student.homeReturnStartPeriod) {
      return 'home_return';
    }

    return null;
  }, [students, records, selectedDate]);

  const setAttendanceStatus = (studentId: string, period: number, status: AttendanceStatus | null) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // 활성 세션 확인
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
    const sessionId = currentSession?.id;

    // 빈 값이면 기록 삭제 (단, 귀가 학생의 자동 귀가 상태는 유지)
    if (!status) {
      // 귀가 학생이고 귀가 시작 교시 이후면 삭제하지 않음 (자동 귀가 상태 유지)
      if (student.isHomeReturn && student.homeReturnStartPeriod && period >= student.homeReturnStartPeriod) {
        return; // 자동 귀가 상태는 수동으로 삭제 불가
      }
      
      // 홈스쿨링 기간이면 삭제하지 않음 (자동 홈스쿨링 상태 유지)
      if (isHomeSchoolPeriod(student, selectedDate)) {
        return; // 자동 홈스쿨링 상태는 수동으로 삭제 불가
      }
      
      const updatedRecords = records.filter(
        r => !(r.studentId === studentId && r.date === selectedDate && r.period === period)
      );
      setRecords(updatedRecords);
      attendanceStorage.save(updatedRecords, sessionId);
      return;
    }

    // 귀가 상태인 경우, 해당 교시부터 마지막 교시까지 모두 적용
    const targetPeriods = status === 'home_return'
      ? visiblePeriods.filter(p => p.period >= period).map(p => p.period)
      : [period];

    let updatedRecords = [...records];

    targetPeriods.forEach(targetPeriod => {
      let finalStatus = status;

      // 홈스쿨링 기간이면 자동으로 홈스쿨링 상태로 (다른 상태로 변경 불가)
      if (isHomeSchoolPeriod(student, selectedDate)) {
        finalStatus = 'home_school';
      }

      const recordId = `${studentId}-${selectedDate}-${targetPeriod}`;
      const existingIndex = updatedRecords.findIndex(r => r.id === recordId);

      const newRecord: AttendanceRecord = {
        id: recordId,
        studentId,
        date: selectedDate,
        period: targetPeriod,
        status: finalStatus,
        sessionId,
      };

      if (existingIndex >= 0) {
        updatedRecords[existingIndex] = newRecord;
      } else {
        updatedRecords.push(newRecord);
      }
    });

    setRecords(updatedRecords);
    attendanceStorage.save(updatedRecords, sessionId);
  };

  const bulkSetAttendance = (period: number, status: AttendanceStatus) => {
    if (!canEditAttendance(currentUser)) {
      alert('출석을 설정할 권한이 없습니다.');
      return;
    }

    // 활성 세션 확인
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
    const sessionId = currentSession?.id;

    const updatedRecords = [...records];
    
    // 귀가 상태인 경우, 해당 교시부터 마지막 교시까지 모두 적용
    const targetPeriods = status === 'home_return' 
      ? visiblePeriods.filter(p => p.period >= period).map(p => p.period)
      : [period];
    
    students.forEach(student => {
      targetPeriods.forEach(targetPeriod => {
        let finalStatus = status;
        
        // 홈스쿨링 기간이면 자동으로 홈스쿨링 상태로
        if (isHomeSchoolPeriod(student, selectedDate)) {
          finalStatus = 'home_school';
        }

        const recordId = `${student.id}-${selectedDate}-${targetPeriod}`;
        const existingIndex = updatedRecords.findIndex(r => r.id === recordId);

        const newRecord: AttendanceRecord = {
          id: recordId,
          studentId: student.id,
          date: selectedDate,
          period: targetPeriod,
          status: finalStatus,
          sessionId,
        };

        if (existingIndex >= 0) {
          updatedRecords[existingIndex] = newRecord;
        } else {
          updatedRecords.push(newRecord);
        }
      });
    });

    setRecords(updatedRecords);
    attendanceStorage.save(updatedRecords, sessionId);
    setBulkPeriod(null);
  };

  const bulkSetAttendanceForAllPeriods = (periods: number[], status: AttendanceStatus) => {
    if (!canEditAttendance(currentUser)) {
      alert('출석을 설정할 권한이 없습니다.');
      return;
    }

    // 활성 세션 확인
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
    const sessionId = currentSession?.id;

    const updatedRecords = [...records];
    
    students.forEach(student => {
      periods.forEach(period => {
        let finalStatus = status;
        
        // 홈스쿨링 기간이면 자동으로 홈스쿨링 상태로
        if (isHomeSchoolPeriod(student, selectedDate)) {
          finalStatus = 'home_school';
        }

        // 귀가 상태인 경우, 해당 교시부터 마지막 교시까지 모두 적용
        const targetPeriods = finalStatus === 'home_return' 
          ? visiblePeriods.filter(p => p.period >= period).map(p => p.period)
          : [period];

        targetPeriods.forEach(targetPeriod => {
          const recordId = `${student.id}-${selectedDate}-${targetPeriod}`;
          const existingIndex = updatedRecords.findIndex(r => r.id === recordId);

          const newRecord: AttendanceRecord = {
            id: recordId,
            studentId: student.id,
            date: selectedDate,
            period: targetPeriod,
            status: finalStatus,
            sessionId,
          };

          if (existingIndex >= 0) {
            updatedRecords[existingIndex] = newRecord;
          } else {
            updatedRecords.push(newRecord);
          }
        });
      });
    });

    setRecords(updatedRecords);
    attendanceStorage.save(updatedRecords, sessionId);
  };

  // 날짜별 출석 초기화 함수 (현재 사용되지 않음)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore
  const _resetAttendanceForDate = () => {
    if (!canEditAttendance(currentUser)) {
      alert('출석을 초기화할 권한이 없습니다.');
      return;
    }

    // 활성 세션 확인
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
    const sessionId = currentSession?.id;

    if (confirm(`선택한 날짜(${format(parseISO(selectedDate), 'yyyy년 MM월 dd일')})의 모든 출석 기록을 삭제하시겠습니까?`)) {
      const updatedRecords = records.filter(
        r => !(r.date === selectedDate && students.some(s => s.id === r.studentId))
      );
      setRecords(updatedRecords);
      attendanceStorage.save(updatedRecords, sessionId);
    }
  };

  const resetAttendanceForPeriod = (period: number) => {
    if (!canEditAttendance(currentUser)) {
      alert('출석을 초기화할 권한이 없습니다.');
      return;
    }

    // 활성 세션 확인
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
    const sessionId = currentSession?.id;

    if (confirm(`${period}교시의 모든 출석 기록을 삭제하시겠습니까?`)) {
      const updatedRecords = records.filter(
        r => !(r.date === selectedDate && r.period === period && students.some(s => s.id === r.studentId))
      );
      setRecords(updatedRecords);
      attendanceStorage.save(updatedRecords, sessionId);
    }
  };

  const resetAllAttendance = () => {
    if (!canEditAttendance(currentUser)) {
      alert('출석을 초기화할 권한이 없습니다.');
      return;
    }

    // 활성 세션 확인
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(selectedDate, sessions);
    const sessionId = currentSession?.id;

    if (confirm(`선택한 날짜(${format(parseISO(selectedDate), 'yyyy년 MM월 dd일')})의 모든 교시 출석 기록을 삭제하시겠습니까?`)) {
      const updatedRecords = records.filter(
        r => !(r.date === selectedDate && students.some(s => s.id === r.studentId))
      );
      setRecords(updatedRecords);
      attendanceStorage.save(updatedRecords, sessionId);
    }
  };

  const handleApprovePending = (pendingId: string) => {
    if (!canApproveAttendance(currentUser)) {
      alert('출석을 승인할 권한이 없습니다.');
      return;
    }

    const pending = pendingAttendances.find(p => p.id === pendingId);
    if (!pending) return;

    // 승인 처리
    approvePendingAttendance(pendingId, currentUser!.id);
    
    // 출석 기록에 추가
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const currentSession = activeSession || getSessionForDate(pending.date, sessions);
    const sessionId = currentSession?.id;

    const newRecord: AttendanceRecord = {
      id: `${pending.studentId}-${pending.date}-${pending.period}`,
      studentId: pending.studentId,
      date: pending.date,
      period: pending.period,
      status: pending.status,
      note: pending.note,
      sessionId,
    };

    const updatedRecords = [...records];
    const existingIndex = updatedRecords.findIndex(r => r.id === newRecord.id);
    if (existingIndex >= 0) {
      updatedRecords[existingIndex] = newRecord;
    } else {
      updatedRecords.push(newRecord);
    }

    setRecords(updatedRecords);
    attendanceStorage.save(updatedRecords, sessionId);
    loadPendingAttendances();
  };

  const handleRejectPending = (pendingId: string) => {
    if (!canApproveAttendance(currentUser)) {
      alert('출석을 거부할 권한이 없습니다.');
      return;
    }

    rejectPendingAttendance(pendingId, currentUser!.id);
    loadPendingAttendances();
  };

  // visiblePeriods 메모이제이션 (성능 최적화)
  const visiblePeriods = useMemo(() => {
    // 1,2학년은 12교시 제외 (단, 설정된 endPeriod가 11 이하면 설정값 사용)
    const maxPeriodForGrade = (grade === 1 || grade === 2) ? Math.min(endPeriod, 11) : endPeriod;
    return periods.filter(p => p.period >= startPeriod && p.period <= maxPeriodForGrade);
  }, [periods, startPeriod, endPeriod, grade]);

  // 달력 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCalendar && !target.closest('.calendar-modal') && !target.closest('.calendar-icon-btn')) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCalendar]);

  const pendingCount = pendingAttendances.length;
  const canApprove = canApproveAttendance(currentUser);

  const handlePrintPreview = () => {
    setShowPrintPreview(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
  };

  return (
    <div className="attendance-book">
      {canApprove && pendingCount > 0 && (
        <div className="pending-notification">
          <AlertCircle size={20} />
          <span>승인 대기 중인 출석 체크가 {pendingCount}개 있습니다.</span>
          <button onClick={() => setShowPendingPanel(true)} className="view-pending-btn">
            확인하기
          </button>
        </div>
      )}

      {showPendingPanel && canApprove && (
        <div className="pending-panel">
          <div className="pending-panel-header">
            <h3>승인 대기 중인 출석 체크</h3>
            <button onClick={() => setShowPendingPanel(false)} className="close-panel-btn">
              <XCircle size={20} />
            </button>
          </div>
          <div className="pending-list">
            {pendingAttendances.map(pending => {
              const student = students.find(s => s.id === pending.studentId);
              return (
                <div key={pending.id} className="pending-item">
                  <div className="pending-info">
                    <span className="pending-student">{student?.name || '알 수 없음'}</span>
                    <span className="pending-details">
                      {format(parseISO(pending.date), 'MM월 dd일')} {pending.period}교시 - {getStatusLabel(pending.status)}
                    </span>
                    {pending.note && <span className="pending-note">{pending.note}</span>}
                  </div>
                  <div className="pending-actions">
                    <button
                      onClick={() => handleApprovePending(pending.id)}
                      className="approve-btn"
                    >
                      <CheckCircle2 size={16} />
                      승인
                    </button>
                    <button
                      onClick={() => handleRejectPending(pending.id)}
                      className="reject-btn"
                    >
                      <XCircle size={16} />
                      거부
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="attendance-header">
        <h2>출석부</h2>
        {currentUser?.role === 'student_monitor' && (
          <div className="role-badge">
            <AlertCircle size={16} />
            <span>임시 체크 모드 (승인 필요)</span>
          </div>
        )}
      </div>

      <div className="config-section">
        <div className="config-row">
          <label>
            <span>학기/방학:</span>
            <span className="semester-display">
              {schedules.length > 0 ? (
                (() => {
                  const matchedSchedule = getSemesterForDate(selectedDate, schedules);
                  return matchedSchedule ? matchedSchedule.name : semester;
                })()
              ) : (
                semester
              )}
            </span>
          </label>
          <label>
            <span>학년:</span>
            <select value={grade} onChange={(e) => setGrade(Number(e.target.value) as 1 | 2 | 3)}>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </label>
          <label>
            <span>반:</span>
            <select value={classNum} onChange={(e) => setClassNum(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)}>
              <option value="1">1반</option>
              <option value="2">2반</option>
              <option value="3">3반</option>
              <option value="4">4반</option>
              <option value="5">5반</option>
              <option value="6">6반</option>
            </select>
          </label>
          <label>
            <span>날짜:</span>
            <div className="date-controls">
              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="date-input"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMonth(parseISO(selectedDate));
                    setShowCalendar(!showCalendar);
                  }}
                  className="calendar-icon-btn"
                  title="달력으로 선택"
                >
                  <Calendar size={18} />
                </button>
              </div>
              {showCalendar && (
                <div className="calendar-modal">
                  <div className="calendar-header">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(addDays(startOfMonth(calendarMonth), -1))}
                      className="calendar-nav-btn"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="calendar-month-year">
                      {getYear(calendarMonth)}년 {getMonth(calendarMonth) + 1}월
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(addDays(startOfMonth(calendarMonth), 1))}
                      className="calendar-nav-btn"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="calendar-weekdays">
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                      <div key={day} className="calendar-weekday">{day}</div>
                    ))}
                  </div>
                  <div className="calendar-days">
                    {(() => {
                      const monthStart = startOfMonth(calendarMonth);
                      const monthEnd = endOfMonth(calendarMonth);
                      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
                      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
                      const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
                      
                      return days.map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const isCurrentMonth = isSameMonth(day, calendarMonth);
                        const isSelected = isSameDay(day, parseISO(selectedDate));
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                          <button
                            key={dayStr}
                            type="button"
                            onClick={() => {
                              setSelectedDate(dayStr);
                              setShowCalendar(false);
                            }}
                            className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                            disabled={!isCurrentMonth}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <div className="calendar-footer">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                        setShowCalendar(false);
                      }}
                      className="calendar-today-btn"
                    >
                      오늘
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCalendar(false)}
                      className="calendar-close-btn"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
              <div className="date-nav-buttons">
                <button
                  onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), -1), 'yyyy-MM-dd'))}
                  className="date-nav-btn"
                  title="이전 날짜"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="date-nav-btn today-btn"
                  title="오늘"
                >
                  <Calendar size={16} />
                  <span>오늘</span>
                </button>
                <button
                  onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
                  className="date-nav-btn"
                  title="다음 날짜"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </label>
        </div>
        <div className="config-note">
          <p>💡 교시 범위 및 시간 설정은 <strong>설정</strong> 메뉴에서 할 수 있습니다.</p>
        </div>
      </div>

      <div className="attendance-table-container">
        <div className="date-info">
          <div className="date-info-left">
            <strong>{format(parseISO(selectedDate), 'yyyy년 MM월 dd일')}</strong>
            <span className="date-weekday">{getWeekdayKorean(selectedDate)}</span>
            {(() => {
              const holidays = holidayStorage.load();
              const dayType = getDayType(selectedDate, schedules, holidays);
              return <span className={`day-type-badge ${dayType}`}>{getDayTypeLabel(dayType)}</span>;
            })()}
          </div>
          <div className="reset-buttons-group">
            <button
              onClick={handlePrintPreview}
              className="print-preview-btn"
              title="인쇄 미리보기"
            >
              <Eye size={16} />
              <span>미리보기</span>
            </button>
            <button
              onClick={handlePrint}
              className="print-btn"
              title="인쇄"
            >
              <Printer size={16} />
              <span>인쇄</span>
            </button>
            {bulkPeriod ? (
              <button
                onClick={() => resetAttendanceForPeriod(bulkPeriod)}
                className="reset-attendance-btn period-reset-btn"
                title={`${bulkPeriod}교시 초기화`}
              >
                <Trash2 size={16} />
                <span>{bulkPeriod}교시 초기화</span>
              </button>
            ) : (
              <button
                onClick={resetAllAttendance}
                className="reset-attendance-btn all-reset-btn"
                title="전체 초기화"
              >
                <Trash2 size={16} />
                <span>전체 초기화</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="bulk-attendance-panel">
          <div className="bulk-panel-header">
            <CheckSquare size={18} />
            <span>일괄 출석 설정</span>
          </div>
          <div className="bulk-panel-controls">
            <div className="bulk-control-group">
              <label>교시 선택:</label>
              <select
                value={bulkPeriod || ''}
                onChange={(e) => setBulkPeriod(e.target.value ? Number(e.target.value) : null)}
                className="bulk-period-select"
              >
                <option value="">전체 교시</option>
                {visiblePeriods.map(p => (
                  <option key={p.period} value={p.period}>
                    {p.period}교시 ({p.startTime} ~ {p.endTime})
                  </option>
                ))}
              </select>
            </div>
            <div className="bulk-control-group">
              <label>상태 선택:</label>
              <div className="bulk-status-buttons">
                {['present', 'absent', 'late', 'early_leave', 'leave', 'sick', 'home_return'].map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      if (bulkPeriod) {
                        bulkSetAttendance(bulkPeriod, status as AttendanceStatus);
                      } else {
                        // 전체 교시에 적용 - 모든 visiblePeriods에 대해 한 번에 처리
                        if (visiblePeriods.length > 0) {
                          bulkSetAttendanceForAllPeriods(visiblePeriods.map(p => p.period), status as AttendanceStatus);
                        }
                      }
                    }}
                    className="bulk-status-button"
                    style={{ 
                      backgroundColor: getStatusColor(status as AttendanceStatus) + '20', 
                      color: getStatusColor(status as AttendanceStatus),
                      borderColor: getStatusColor(status as AttendanceStatus)
                    }}
                    disabled={!bulkPeriod && visiblePeriods.length === 0}
                  >
                    {getStatusLabel(status as AttendanceStatus)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th rowSpan={2} className="student-col">번호</th>
                <th rowSpan={2} className="student-col">이름</th>
                {visiblePeriods.map(p => (
                  <th key={p.period} className="period-col">
                    <div>{p.period}교시</div>
                    <div className="period-time">{p.startTime} ~ {p.endTime}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const isHomeSchoolToday = isHomeSchoolPeriod(student, selectedDate);
                const isFriendshipClassToday = isFriendshipClassPeriod(student);
                return (
                <tr key={student.id}>
                  <td className="student-col">{student.number}</td>
                  <td className="student-col">
                    {student.name}
                    {isHomeSchoolToday && <span className="badge homeschool">홈스</span>}
                    {student.isHomeReturn && student.homeReturnStartPeriod && <span className="badge homereturn">귀가</span>}
                    {isFriendshipClassToday && <span className="badge friendship">우정반</span>}
                  </td>
                  {visiblePeriods.map(p => {
                    const isHomeSchool = isHomeSchoolPeriod(student, selectedDate);
                    let currentStatus = getAttendanceStatus(student.id, p.period);
                    
                    // 홈스쿨링 기간이면 자동으로 홈스쿨링 상태로 설정 (기록이 없을 경우)
                    if (isHomeSchool && !currentStatus) {
                      currentStatus = 'home_school';
                    }
                    
                    // 일괄 출석 패널과 동일한 순서로 모든 상태 표시 (항상 동일한 목록)
                    const allStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'early_leave', 'leave', 'sick', 'home_return', 'home_school'];
                    
                    return (
                      <td key={p.period} className="attendance-cell">
                        <select
                          value={currentStatus || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAttendanceStatus(student.id, p.period, value ? (value as AttendanceStatus) : null);
                          }}
                          className={`status-select ${currentStatus ? `status-${currentStatus}` : ''}`}
                          style={currentStatus ? { 
                            backgroundColor: getStatusColor(currentStatus) + '20',
                            color: getStatusColor(currentStatus),
                            borderColor: getStatusColor(currentStatus),
                            fontWeight: '500'
                          } : {
                            backgroundColor: 'white',
                            color: '#4b5563'
                          }}
                        >
                          <option value="">-</option>
                          {allStatuses.map(status => (
                            <option key={status} value={status}>
                              {getStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPrintPreview && (
        <div className="print-preview-modal">
          <div className="print-preview-content">
            <div className="print-preview-header">
              <h3>인쇄 미리보기</h3>
              <div className="print-preview-actions">
                <button onClick={handlePrint} className="print-preview-print-btn">
                  <Printer size={18} />
                  <span>인쇄</span>
                </button>
                <button onClick={handleClosePrintPreview} className="print-preview-close-btn">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="print-preview-body">
              <div className="print-preview-table-container">
                    <div className="print-preview-date-info">
                      <div className="print-preview-date-left">
                        <strong>{format(parseISO(selectedDate), 'yyyy년 MM월 dd일')}</strong>
                        <span className="date-weekday">{getWeekdayKorean(selectedDate)}</span>
                        {(() => {
                          const holidays = holidayStorage.load();
                          const dayType = getDayType(selectedDate, schedules, holidays);
                          return <span className={`day-type-badge ${dayType}`}>{getDayTypeLabel(dayType)}</span>;
                        })()}
                      </div>
                    </div>
                <div className="print-preview-table-wrapper">
                  <table className="print-preview-table">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="student-col">번호</th>
                        <th rowSpan={2} className="student-col">이름</th>
                        {visiblePeriods.map(p => (
                          <th key={p.period} className="period-col">
                            <div>{p.period}교시</div>
                            <div className="period-time">{p.startTime} ~ {p.endTime}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => {
                        const isHomeSchoolToday = isHomeSchoolPeriod(student, selectedDate);
                        const isFriendshipClassToday = isFriendshipClassPeriod(student);
                        return (
                          <tr key={student.id}>
                            <td className="student-col">{student.number}</td>
                            <td className="student-col">
                              {student.name}
                              {isHomeSchoolToday && <span className="badge homeschool">홈스</span>}
                              {student.isHomeReturn && student.homeReturnStartPeriod && <span className="badge homereturn">귀가</span>}
                              {isFriendshipClassToday && <span className="badge friendship">우정반</span>}
                            </td>
                            {visiblePeriods.map(p => {
                              const currentStatus = getAttendanceStatus(student.id, p.period);
                              return (
                                <td key={p.period} className="attendance-cell">
                                  {currentStatus ? getStatusLabel(currentStatus) : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

